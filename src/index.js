import { createServer } from "node:http";
import { fileURLToPath } from "url";
import { hostname } from "node:os";
import { spawn } from "node:child_process";
import https from "node:https";
import http from "node:http";
import { server as wisp, logging } from "@mercuryworkshop/wisp-js/server";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";

import { scramjetPath } from "@mercuryworkshop/scramjet/path";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const publicPath = fileURLToPath(new URL("../public/", import.meta.url));

// --- CONFIGURATION ---
const TMDB_API_KEY = "1d776c7ac6fbdaea19620e1d667b0670"; // Your Key
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

// Wisp Configuration
logging.set_level(logging.NONE);
Object.assign(wisp.options, {
  allow_udp_streams: false,
  hostname_blacklist: [/example\.com/],
  dns_servers: ["1.1.1.3", "1.0.0.3"]
});

const fastify = Fastify({
	serverFactory: (handler) => {
		return createServer()
			.on("request", (req, res) => {
				res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				handler(req, res);
			})
			.on("upgrade", (req, socket, head) => {
				if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
				else socket.end();
			});
	},
});

// --- STATIC FILES ---
fastify.register(fastifyStatic, { root: publicPath, decorateReply: true });
fastify.register(fastifyStatic, { root: scramjetPath, prefix: "/scram/", decorateReply: false });
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false });
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });

// --- API: MOVIES (TMDb) ---

// 1. Trending (Home Page)
fastify.get("/api/tmdb/trending", async (request, reply) => {
    const url = `${TMDB_BASE_URL}/trending/all/week?api_key=${TMDB_API_KEY}`;
    return fetchTmdb(url);
});

// 2. Search
fastify.get("/api/tmdb/search", async (request, reply) => {
    const { q } = request.query;
    if (!q) return reply.code(400).send("Missing query");
    const url = `${TMDB_BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(q)}&include_adult=false`;
    return fetchTmdb(url);
});

// 3. Details
fastify.get("/api/tmdb/details", async (request, reply) => {
    const { id, type } = request.query;
    if (!id || !type) return reply.code(400).send("Missing id or type");
    
    // Fetch details AND credits (cast) in one go using append_to_response
    const url = `${TMDB_BASE_URL}/${type}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits,videos`;
    return fetchTmdb(url, true);
});

// Helper for TMDb
function fetchTmdb(url, isDetails = false) {
    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    const json = JSON.parse(data);
                    
                    if (isDetails) {
                        resolve({
                            id: json.id,
                            title: json.title || json.name,
                            poster: json.poster_path ? `https://image.tmdb.org/t/p/w500${json.poster_path}` : null,
                            backdrop: json.backdrop_path ? `https://image.tmdb.org/t/p/original${json.backdrop_path}` : null,
                            year: (json.release_date || json.first_air_date || "").substring(0, 4),
                            overview: json.overview,
                            rating: json.vote_average ? json.vote_average.toFixed(1) : "N/A",
                            genres: (json.genres || []).map(g => g.name).slice(0, 3).join(", "),
                            cast: (json.credits?.cast || []).slice(0, 5).map(c => c.name).join(", "),
                            trailer: (json.videos?.results || []).find(v => v.type === "Trailer" && v.site === "YouTube")?.key
                        });
                    } else {
                        // Simplify List Results
                        resolve((json.results || []).map(item => ({
                            id: item.id,
                            type: item.media_type || (item.title ? 'movie' : 'tv'),
                            title: item.title || item.name,
                            poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
                            year: (item.release_date || item.first_air_date || "").substring(0, 4),
                            rating: item.vote_average ? item.vote_average.toFixed(1) : null
                        })).filter(i => i.poster)); // Only return items with posters
                    }
                } catch (e) { resolve([]); }
            });
        }).on("error", () => resolve([]));
    });
}

// --- API: MUSIC (Restored) ---

// 1. Search Music
fastify.get("/api/search", async (request, reply) => {
    const { q } = request.query;
    if (!q) return reply.code(400).send("Missing 'q'");
    return new Promise((resolve) => {
        const yt = spawn("yt-dlp", ["--dump-json", "--flat-playlist", "--skip-download", `scsearch20:${q}`]);
        let output = "";
        yt.stdout.on("data", (data) => output += data.toString());
        yt.on("close", () => {
            const results = output.trim().split('\n').map(line => {
                try { return JSON.parse(line); } catch (e) { return null; }
            }).filter(x => x).map(r => {
                let bestThumb = r.thumbnail;
                if (r.thumbnails && r.thumbnails.length > 0) {
                     const sorted = r.thumbnails.sort((a, b) => (b.width || 0) - (a.width || 0));
                     bestThumb = sorted[0].url; 
                }
                return { title: r.title, uploader: r.uploader, url: r.url, thumbnail: bestThumb };
            });
            resolve(results);
        });
    });
});

// 2. Stream Music
fastify.get("/api/stream", (request, reply) => {
    const { url } = request.query;
    if (!url) return reply.code(400).send("Missing URL");
    reply.header("Content-Type", "audio/mpeg");
    const yt = spawn("yt-dlp", ["-x", "--audio-format", "mp3", "-o", "-", url]);
    return reply.send(yt.stdout);
});

// 3. Image Proxy (Bypass CORS)
fastify.get("/api/image", (request, reply) => {
    const { url } = request.query;
    if (!url) return reply.code(400).send("Missing URL");
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
        if (res.headers['content-type']) reply.header("Content-Type", res.headers['content-type']);
        reply.header("Cross-Origin-Resource-Policy", "cross-origin");
        return reply.send(res);
    }).on('error', (err) => reply.code(500).send("Error"));
});

// --- SERVER START ---
fastify.setNotFoundHandler((res, reply) => reply.code(404).type('text/html').sendFile('404.html'));

fastify.listen({ port: parseInt(process.env.PORT || "8080"), host: "0.0.0.0" }, (err, address) => {
    if (err) { console.error(err); process.exit(1); }
    console.log(`Listening on ${address}`);
});