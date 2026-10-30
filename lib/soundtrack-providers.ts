/**
 * Sonic Architecture — Step 2: Music Provider Abstraction
 *
 * Implements:
 * 1. `MusicProvider` interface (`search(artist, title)`, `embedUrl?(t)`, `previewUrl?(t)`)
 * 2. `SpotifyEmbedProvider`:
 *    - Embed by URI (`https://open.spotify.com/embed/track/{id}`), zero per-user OAuth login
 *      (avoids Spotify dev-mode's 5-user allowlist restriction).
 *    - Optional server-side Client Credentials search (`SPOTIFY_CLIENT_ID` + `SPOTIFY_CLIENT_SECRET`)
 *      strictly capped at `limit=5` (respecting Spotify dev-mode's <= 10 search limit).
 *    - Never fabricates track IDs or URLs.
 * 3. `ITunesPreviewProvider`:
 *    - Free, zero-key public Apple iTunes Search API (`https://itunes.apple.com/search`).
 *    - Resolves canonical `trackId`, `title`, `artist`, `album`, 600x600 `coverUrl`,
 *      real `storeUrl`, and a CORS-enabled 30s AAC `previewUrl` (`audio-ssl.itunes.apple.com`)
 *      compatible with Web Audio `AnalyserNode`.
 * 4. `CompositeMusicProvider`:
 *    - Combines `SpotifyEmbedProvider` (when configured) with `ITunesPreviewProvider` so
 *      resolved tracks get both a Spotify embed URL (if resolved) and a 30s CORS audio preview URL.
 */

import type { ResolvedTrack } from "./types";

export interface MusicProvider {
  readonly id: "itunes" | "spotify-embed" | "deezer";
  search(artist: string, title: string): Promise<ResolvedTrack | null>;
  searchArtistTopTracks?(artist: string, limit?: number): Promise<ResolvedTrack[]>;
  searchGenreTracks?(genre: string, limit?: number): Promise<ResolvedTrack[]>;
  embedUrl?(track: ResolvedTrack): string;
  previewUrl?(track: ResolvedTrack): string | null;
}

function normalizeTokenString(input: string): string {
  return input
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9\u00c0-\u024f\u0400-\u04ff\u3040-\u30ff\u4e00-\u9faf]+/g, " ")
    .trim();
}

function tokensOverlap(expected: string, actual: string): boolean {
  const expNorm = normalizeTokenString(expected);
  const actNorm = normalizeTokenString(actual);
  if (!expNorm || !actNorm) return false;
  if (actNorm.includes(expNorm) || expNorm.includes(actNorm)) return true;

  const expTokens = expNorm.split(/\s+/).filter((t) => t.length >= 2);
  const actTokens = new Set(actNorm.split(/\s+/).filter((t) => t.length >= 2));
  if (expTokens.length === 0) return true;

  let matches = 0;
  for (const tk of expTokens) {
    if (actTokens.has(tk)) matches++;
  }
  return matches / expTokens.length >= 0.5;
}

export function buildExternalMusicSearchUrl(artist: string, title: string): string {
  const query = `${artist.trim()} ${title.trim()}`.trim();
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

// ============================================================================
// 1. SPOTIFY EMBED PROVIDER (No User Login; Client Credentials Optional)
// ============================================================================

interface SpotifyTokenCache {
  accessToken: string;
  expiresAtMs: number;
}

interface SpotifySearchTrackItem {
  id?: string;
  uri?: string;
  name?: string;
  preview_url?: string | null;
  duration_ms?: number;
  external_urls?: { spotify?: string };
   artists?: ReadonlyArray<{ name?: string }>;
  album?: {
    name?: string;
    release_date?: string;
    images?: ReadonlyArray<{ url?: string; width?: number }>;
  };
}

interface SpotifySearchResponse {
  tracks?: {
    items?: ReadonlyArray<SpotifySearchTrackItem>;
  };
}

const SPOTIFY_ID_REGEX = /^[A-Za-z0-9]{22}$/;

export class SpotifyEmbedProvider implements MusicProvider {
  public readonly id = "spotify-embed" as const;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly timeoutMs: number;
  private tokenCache: SpotifyTokenCache | null = null;

  constructor(options?: {
    clientId?: string;
    clientSecret?: string;
    timeoutMs?: number;
  }) {
    this.clientId = (
      options?.clientId ??
      (typeof process !== "undefined" ? process.env.SPOTIFY_CLIENT_ID : "") ??
      ""
    ).trim();
    this.clientSecret = (
      options?.clientSecret ??
      (typeof process !== "undefined" ? process.env.SPOTIFY_CLIENT_SECRET : "") ??
      ""
    ).trim();
    this.timeoutMs = options?.timeoutMs ?? 4200;
  }

  public isConfigured(): boolean {
    return this.clientId.length > 0 && this.clientSecret.length > 0;
  }

  public embedUrl(track: ResolvedTrack): string {
    const cleanId = track.trackId.replace(/^spotify:track:/i, "").trim();
    if (SPOTIFY_ID_REGEX.test(cleanId)) {
      return `https://open.spotify.com/embed/track/${cleanId}?utm_source=generator&theme=0`;
    }
    return track.embedUrl ?? "";
  }

  public previewUrl(track: ResolvedTrack): string | null {
    return track.previewUrl ?? null;
  }

  private async getAppAccessToken(): Promise<string | null> {
    if (!this.isConfigured()) return null;
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAtMs > now + 15_000) {
      return this.tokenCache.accessToken;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const credentials = Buffer.from(
        `${this.clientId}:${this.clientSecret}`
      ).toString("base64");
      const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
        signal: controller.signal,
      });

      if (!response.ok) return null;
      const data = (await response.json()) as {
        access_token?: string;
        expires_in?: number;
      };
      if (!data.access_token) return null;

      this.tokenCache = {
        accessToken: data.access_token,
        expiresAtMs: now + (data.expires_in ?? 3600) * 1000,
      };
      return data.access_token;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  public async search(
    artist: string,
    title: string
  ): Promise<ResolvedTrack | null> {
    const token = await this.getAppAccessToken();
    if (!token) return null;

    // Spotify dev-mode search caps `limit` at 10; we request 5.
    const query = `track:${title.trim()} artist:${artist.trim()}`;
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      query
    )}&type=track&limit=5`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
      if (!response.ok) return null;

      const payload = (await response.json()) as SpotifySearchResponse;
      const items = payload.tracks?.items ?? [];
      for (const item of items) {
        const spId = item.id?.trim() ?? "";
        const spTitle = item.name?.trim() ?? "";
        const spArtist = item.artists?.[0]?.name?.trim() ?? "";
        if (!SPOTIFY_ID_REGEX.test(spId) || !spTitle || !spArtist) continue;

        if (
          tokensOverlap(artist, spArtist) &&
          tokensOverlap(title, spTitle)
        ) {
          const coverUrl = item.album?.images?.[0]?.url;
          const releaseYear = item.album?.release_date
            ? Number.parseInt(item.album.release_date.slice(0, 4), 10)
            : undefined;
          const resolved: ResolvedTrack = {
            providerId: "spotify-embed",
            trackId: spId,
            title: spTitle,
            artist: spArtist,
            album: item.album?.name,
            coverUrl,
            previewUrl: item.preview_url ?? null,
            embedUrl: `https://open.spotify.com/embed/track/${spId}?utm_source=generator&theme=0`,
            externalSearchUrl: buildExternalMusicSearchUrl(spArtist, spTitle),
            storeUrl: item.external_urls?.spotify,
            durationMs: item.duration_ms,
            releaseYear: Number.isFinite(releaseYear) ? releaseYear : undefined,
          };
          return resolved;
        }
      }
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

// ============================================================================
// 2. APPLE ITUNES SEARCH PROVIDER (Free, Zero Keys, 30s CORS Audio Previews)
// ============================================================================

interface ITunesSearchResultItem {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  previewUrl?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
  trackTimeMillis?: number;
  releaseDate?: string;
  primaryGenreName?: string;
}

interface ITunesSearchResponse {
  resultCount?: number;
  results?: ReadonlyArray<ITunesSearchResultItem>;
}

export class ITunesPreviewProvider implements MusicProvider {
  public readonly id = "itunes" as const;
  private readonly timeoutMs: number;

  constructor(options?: { timeoutMs?: number }) {
    this.timeoutMs = options?.timeoutMs ?? 4200;
  }

  public previewUrl(track: ResolvedTrack): string | null {
    return track.previewUrl ?? null;
  }

  public async search(
    artist: string,
    title: string
  ): Promise<ResolvedTrack | null> {
    const cleanArtist = artist.trim();
    const cleanTitle = title.trim();
    if (!cleanArtist || !cleanTitle) return null;

    const term = `${cleanArtist} ${cleanTitle}`;
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      term
    )}&media=music&entity=song&limit=5`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) return null;

      const data = (await response.json()) as ITunesSearchResponse;
      const results = data.results ?? [];

      for (const item of results) {
        const tId = item.trackId ? String(item.trackId) : "";
        const tName = item.trackName?.trim() ?? "";
        const aName = item.artistName?.trim() ?? "";
        if (!tId || !tName || !aName) continue;

        if (
          tokensOverlap(cleanArtist, aName) &&
          tokensOverlap(cleanTitle, tName)
        ) {
          const highResCover = item.artworkUrl100
            ? item.artworkUrl100.replace(/100x100bb/g, "300x300bb")
            : undefined;
          const releaseYear = item.releaseDate
            ? Number.parseInt(item.releaseDate.slice(0, 4), 10)
            : undefined;

          return {
            providerId: "itunes",
            trackId: tId,
            title: tName,
            artist: aName,
            album: item.collectionName,
            coverUrl: highResCover,
            previewUrl: item.previewUrl ?? null,
            externalSearchUrl: buildExternalMusicSearchUrl(aName, tName),
            storeUrl: item.trackViewUrl,
            durationMs: item.trackTimeMillis,
            releaseYear: Number.isFinite(releaseYear) ? releaseYear : undefined,
            genreName: item.primaryGenreName,
          };
        }
      }
      return null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  public async searchArtistTopTracks(
    artist: string,
    limit: number = 4
  ): Promise<ResolvedTrack[]> {
    const cleanArtist = artist.trim();
    if (!cleanArtist) return [];

    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      cleanArtist
    )}&media=music&entity=song&limit=${Math.max(limit * 2, 8)}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) return [];

      const data = (await response.json()) as ITunesSearchResponse;
      const results = data.results ?? [];
      const tracks: ResolvedTrack[] = [];

      for (const item of results) {
        const tId = item.trackId ? String(item.trackId) : "";
        const tName = item.trackName?.trim() ?? "";
        const aName = item.artistName?.trim() ?? "";
        if (!tId || !tName || !aName) continue;

        if (tokensOverlap(cleanArtist, aName)) {
          const highResCover = item.artworkUrl100
            ? item.artworkUrl100.replace(/100x100bb/g, "300x300bb")
            : undefined;
          const releaseYear = item.releaseDate
            ? Number.parseInt(item.releaseDate.slice(0, 4), 10)
            : undefined;

          tracks.push({
            providerId: "itunes",
            trackId: tId,
            title: tName,
            artist: aName,
            album: item.collectionName,
            coverUrl: highResCover,
            previewUrl: item.previewUrl ?? null,
            externalSearchUrl: buildExternalMusicSearchUrl(aName, tName),
            storeUrl: item.trackViewUrl,
            durationMs: item.trackTimeMillis,
            releaseYear: Number.isFinite(releaseYear) ? releaseYear : undefined,
            genreName: item.primaryGenreName,
          });

          if (tracks.length >= limit) break;
        }
      }
      return tracks;
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  public async searchGenreTracks(
    genre: string,
    limit: number = 4
  ): Promise<ResolvedTrack[]> {
    const cleanGenre = genre.trim();
    if (!cleanGenre) return [];

    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      cleanGenre
    )}&media=music&entity=song&limit=${limit}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) return [];

      const data = (await response.json()) as ITunesSearchResponse;
      const results = data.results ?? [];
      const tracks: ResolvedTrack[] = [];

      for (const item of results) {
        const tId = item.trackId ? String(item.trackId) : "";
        const tName = item.trackName?.trim() ?? "";
        const aName = item.artistName?.trim() ?? "";
        if (!tId || !tName || !aName) continue;

        const highResCover = item.artworkUrl100
          ? item.artworkUrl100.replace(/100x100bb/g, "300x300bb")
          : undefined;
        const releaseYear = item.releaseDate
          ? Number.parseInt(item.releaseDate.slice(0, 4), 10)
          : undefined;

        tracks.push({
          providerId: "itunes",
          trackId: tId,
          title: tName,
          artist: aName,
          album: item.collectionName,
          coverUrl: highResCover,
          previewUrl: item.previewUrl ?? null,
          externalSearchUrl: buildExternalMusicSearchUrl(aName, tName),
          storeUrl: item.trackViewUrl,
          durationMs: item.trackTimeMillis,
          releaseYear: Number.isFinite(releaseYear) ? releaseYear : undefined,
          genreName: item.primaryGenreName,
        });

        if (tracks.length >= limit) break;
      }
      return tracks;
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }
}

// ============================================================================
// 3. COMPOSITE PROVIDER (Spotify Embed + iTunes 30s CORS Previews)
// ============================================================================

export class CompositeMusicProvider implements MusicProvider {
  public readonly id = "itunes" as const;
  private readonly spotifyProvider: SpotifyEmbedProvider;
  private readonly itunesProvider: ITunesPreviewProvider;

  constructor(options?: {
    spotifyClientId?: string;
    spotifyClientSecret?: string;
    timeoutMs?: number;
  }) {
    this.spotifyProvider = new SpotifyEmbedProvider({
      clientId: options?.spotifyClientId,
      clientSecret: options?.spotifyClientSecret,
      timeoutMs: options?.timeoutMs,
    });
    this.itunesProvider = new ITunesPreviewProvider({
      timeoutMs: options?.timeoutMs,
    });
  }

  public getProviderSummary(): string {
    return this.spotifyProvider.isConfigured()
      ? "spotify-embed+itunes-preview"
      : "itunes-preview+spotify-embed-uri";
  }

  public embedUrl(track: ResolvedTrack): string {
    return this.spotifyProvider.embedUrl(track);
  }

  public previewUrl(track: ResolvedTrack): string | null {
    return track.previewUrl ?? null;
  }

  public async search(
    artist: string,
    title: string
  ): Promise<ResolvedTrack | null> {
    const [itunesResult, spotifyResult] = await Promise.all([
      this.itunesProvider.search(artist, title),
      this.spotifyProvider.isConfigured()
        ? this.spotifyProvider.search(artist, title)
        : Promise.resolve(null),
    ]);

    if (spotifyResult && itunesResult) {
      return {
        ...spotifyResult,
        previewUrl: spotifyResult.previewUrl ?? itunesResult.previewUrl,
        coverUrl: spotifyResult.coverUrl ?? itunesResult.coverUrl,
        storeUrl: spotifyResult.storeUrl ?? itunesResult.storeUrl,
        genreName: itunesResult.genreName,
      };
    }

    return spotifyResult ?? itunesResult;
  }

  public async searchArtistTopTracks(
    artist: string,
    limit: number = 4
  ): Promise<ResolvedTrack[]> {
    return this.itunesProvider.searchArtistTopTracks(artist, limit);
  }

  public async searchGenreTracks(
    genre: string,
    limit: number = 4
  ): Promise<ResolvedTrack[]> {
    return this.itunesProvider.searchGenreTracks(genre, limit);
  }
}
