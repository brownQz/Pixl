import nodePath from "node:path";
import process from "node:process";
import { start } from "node:repl";
import { ShardingManager } from "discord.js";
import { enableRepl, isProd, shardingMode, shardsCount } from "./config/index.js";
import { importURLToString } from "./utils/functions/importURLToString.js";
import { RawonLogger } from "./utils/structures/RawonLogger.js";

const log = new RawonLogger({ prod: isProd });

const manager = new ShardingManager(nodePath.resolve(importURLToString(import.meta.url), "bot.js"), {
    totalShards: shardsCount,
    respawn: true,
    token: process.env.DISCORD_TOKEN,
    mode: shardingMode
});

if (enableRepl) {
    const repl = start({
        prompt: "> "
    });

    repl.context.shardManager = manager;
    process.stdin.on("data", () => repl.displayPrompt(true));
    repl.on("exit", () => process.exit());
}

await manager
    .on("shardCreate", shard => {
        log.info(`[ShardManager] Shard #${shard.id} has spawned.`);
        shard
            .on("disconnect", () =>
                log.warn("SHARD_DISCONNECTED: ", { stack: `[ShardManager] Shard #${shard.id} has disconnected.` })
            )
            .on("reconnecting", () => log.info(`[ShardManager] Shard #${shard.id} has reconnected.`));
        if (manager.shards.size === manager.totalShards)
            log.info("[ShardManager] All shards are spawned successfully.");
    })
    .spawn()
    .catch((error: unknown) => log.error("SHARD_SPAWN_ERR: ", error));