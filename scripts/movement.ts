import { Actor } from "bdsx/bds/actor";
import { Block } from "bdsx/bds/block";
import { BlockPos, Vec3 } from "bdsx/bds/blockpos";
import { ArmorSlot } from "bdsx/bds/inventory";
import { NetworkIdentifier } from "bdsx/bds/networkidentifier";
import { Packet } from "bdsx/bds/packet";
import { MinecraftPacketIds } from "bdsx/bds/packetids";
import { MovePlayerPacket, PlayerActionPacket } from "bdsx/bds/packets";
import { GameType, Player, ServerPlayer } from "bdsx/bds/player";
import { events } from "bdsx/event";
import { bool_t, float32_t, void_t } from "bdsx/nativetype";
import { procHacker } from "bdsx/prochacker";
import { serverProperties } from "bdsx/serverproperties";
import { CIF } from "../main";

export const MovementType = serverProperties["server-authoritative-movement"] === "client-auth" ? MinecraftPacketIds.MovePlayer : MinecraftPacketIds.PlayerAuthInput;

const lastBPS: Record<string, number> = {};
const isSpinAttacking: Record<string, boolean> = {};
const onGround: Record<string, boolean> = {};
const isGlidingWithElytra: Record<string, boolean> = {};

const lastpos: Record<string, number[]> = {};

const jumpedTick: Record<string, number> = {};
const strafestack: Record<string, number> = {};
const getDamaged: Record<string, boolean> = {};
const isTeleported: Record<string, boolean> = {};
const haveFished: Record<string, boolean> = {};

export const lastRotations = new Map<string, { x: number, y: number }[]>();
function appendRotationRecord(player: ServerPlayer, rotation: { x: number, y: number }) {
    const name = player.getName();
    const currentRotation = lastRotations.get(name);
    if (currentRotation === undefined) {
        lastRotations.set(name, [rotation]);
    } else {
        currentRotation.unshift(rotation);
        currentRotation.splice(3);
        lastRotations.set(name, currentRotation);
    };
};

declare module "bdsx/bds/block" {
    interface Block {
        /**
         * Returns if mobs can be spawned on this block (Func from CIF)
         */
        isSolid(): boolean;
    }
};

Block.prototype.isSolid = procHacker.js(
    "?isSolid@Block@@QEBA_NXZ",
    bool_t,
    { this: Block }
);


declare module "bdsx/bds/actor" {
    interface Actor {
        /**
         * Func from CIF
         */
        getFallDistance(): number;

        /**
         * Func from CIF
         */
        setFallDistance(): void;
    }
};

Actor.prototype.getFallDistance = procHacker.js("?getFallDistance@Actor@@QEBAMXZ", float32_t, { this: Actor });
Actor.prototype.setFallDistance = procHacker.js("?setFallDistance@Actor@@QEAAXM@Z", void_t, { this: Actor });


declare module "bdsx/bds/player" {
    interface Player {
        /**
         * Returns if player is on ices (Func from CIF)
         */
        onIce(): boolean;

        /**
         * Func from CIF
         */
        isSpinAttacking(): boolean;

        /**
         * Returns player's Last Blocks per second (Func from CIF)
         */
        getLastBPS(): number;

        /**
         * Returns if player is not on mid-air (Func from CIF)
         * @description it always returns false in server-auth movement
         */
        onGround(): boolean;

        /**
         * Func from CIF
         */
        isGlidingWithElytra(): boolean;
    }
};

Player.prototype.onIce = function () {
    const pos = BlockPos.create(this.getFeetPos());
    pos.y--;

    const blockName = this.getRegion().getBlock(pos).getName();
    if (blockName.includes("ice")) return true; else return false;
};

Player.prototype.isSpinAttacking = function () {
    const plname = this.getName();
    if (!isSpinAttacking[plname]) isSpinAttacking[plname] = false;
    return isSpinAttacking[plname];
};

Player.prototype.getLastBPS = function () {
    const plname = this.getName();
    if (!lastBPS[plname]) lastBPS[plname] = 0;
    return lastBPS[plname];
};

Player.prototype.onGround = function () {
    const plname = this.getName();
    if (!onGround[plname]) onGround[plname] = false;
    return onGround[plname];
};

Player.prototype.isGlidingWithElytra = function () {
    const plname = this.getName();
    if (!isGlidingWithElytra[plname]) isGlidingWithElytra[plname] = false;
    return isGlidingWithElytra[plname];
};


events.packetBefore(MinecraftPacketIds.PlayerAction).on((pkt, ni) => {
    const pl = ni.getActor()!;
    const plname = pl.getName()!;
    if (pkt.action === PlayerActionPacket.Actions.StartSpinAttack) {
        isSpinAttacking[plname] = true;
    } else if (pkt.action === PlayerActionPacket.Actions.StopSpinAttack) {
        isSpinAttacking[plname] = false;
    };

    if (pkt.action === PlayerActionPacket.Actions.StartGlide) {
        isGlidingWithElytra[plname] = true;
    } else if (pkt.action === PlayerActionPacket.Actions.StopGlide) {
        isGlidingWithElytra[plname] = false;
    };

    if (pkt.action === PlayerActionPacket.Actions.Jump) {
        jumpedTick[plname] = pl.getLevel().getCurrentTick();
    };
});

function isMovePlayerPacket(pkt: Packet): pkt is MovePlayerPacket {
    return (<MovePlayerPacket>pkt).onGround !== undefined;
};

events.packetBefore(MovementType).on((pkt, ni) => {
    const player = ni.getActor();
    if (!player) return;
    
    const plname = player.getName();
    if (isMovePlayerPacket(pkt)) {
        onGround[plname] = pkt.onGround;
    };


    const rotation = {
        x: pkt.headYaw,
        y: pkt.pitch
    };

    appendRotationRecord(player, rotation);
    
    const movePos = pkt.pos;

    const gamemode = player.getGameType();
    if (gamemode !== 2 && gamemode !== 0) return;

    //PHASE
    const region = player.getRegion()!;
    const currentPosBlock = region.getBlock(BlockPos.create(movePos.x, movePos.y - 1.6, movePos.z));
    const currentHeadPosBlock = region.getBlock(BlockPos.create(movePos.x, movePos.y, movePos.z));

    if (currentPosBlock.isSolid() && currentHeadPosBlock.isSolid() &&
        !currentPosBlock.getName().includes("air") && !currentHeadPosBlock.getName().includes("air")
        && player.getGameType() !== GameType.Spectator
        && player.getGameType() !== GameType.CreativeSpectator
        && player.getGameType() !== GameType.Creative
        && player.getGameType() !== GameType.SurvivalSpectator) {
        player.runCommand("tp ~ ~ ~");
    };

    const torso = player.getArmor(ArmorSlot.Torso);
    
    if (torso.getRawNameId() !== "elytra" && isGlidingWithElytra[plname]) {
        CIF.detect(ni, "Fly-E", "Send Glide Packet without Elytra");
    };

    //SPEED
    if (MovementType === MinecraftPacketIds.PlayerAuthInput) return;

    if (isTeleported[plname]) return;
    if (player.isSpinAttacking()) return;

    const lastPos = lastpos[plname];
    const plSpeed = player.getSpeed();

    //5.62 is max speed without any speed effects and while sprinting.
    const maxBPS = plSpeed * 45;

    let bps: number;

    if (lastPos) {
        const x1 = lastPos[0];
        const x2 = movePos.x;
        const y1 = lastPos[1];
        const y2 = movePos.z;

        const xDiff = Math.pow(x1 - x2, 2);
        const yDiff = Math.pow(y1 - y2, 2);

        bps = Number((Math.sqrt(xDiff + yDiff) * 20).toFixed(2));
    } else {
        bps = 0;
    };

    if (bps > maxBPS && bps > 5.61 && !isTeleported[plname]) {

        if (player.getLastBPS() === bps) {
            strafestack[plname] = strafestack[plname] ? strafestack[plname] + 1 : 1;
            if (strafestack[plname] > 14) {
                strafestack[plname] = 0;
                CIF.ban(ni, "Speed-B");
                CIF.detect(ni, "Speed-B", `Strafe (Blocks per second : ${bps})`);
            };
        };


        if (player.onIce() && player.isRiding()) {
            //이거는 그냥 의미 없는 짓거리
        } else if (player.onIce() && !player.isRiding()) {
            //대충 max bps 구해서 처리하는거 만들기
        } else if (!player.onIce() && player.isRiding()) {
            //대충 max bps 구해서 처리하는거 만들기
        };

    };

    lastBPS[plname] = bps;
    lastpos[plname] = [movePos.x, movePos.z];
});

const hasTeleport = procHacker.hooking("?teleportTo@Player@@UEAAXAEBVVec3@@_NHH1@Z", void_t, null, ServerPlayer, Vec3)((pl, pos) => {
    const plname = pl.getName()!;
    isTeleported[plname] = true;
    setTimeout(async () => {
        isTeleported[plname] = false;
    }, 1000);

    return hasTeleport(pl, pos);
});