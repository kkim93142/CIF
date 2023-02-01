"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const networkidentifier_1 = require("bdsx/bds/networkidentifier");
const packetids_1 = require("bdsx/bds/packetids");
const common_1 = require("bdsx/common");
const core_1 = require("bdsx/core");
const event_1 = require("bdsx/event");
const nativetype_1 = require("bdsx/nativetype");
const pointer_1 = require("bdsx/pointer");
const prochacker_1 = require("bdsx/prochacker");
const main_1 = require("../main");
const UINTMAX = 0xffffffff;
const PPSsound = {};
const PPSact = {};
event_1.events.packetBefore(packetids_1.MinecraftPacketIds.MovePlayer).on((pkt, ni) => {
    if (pkt.pos.x > UINTMAX || pkt.pos.y > UINTMAX || pkt.pos.z > UINTMAX) {
        main_1.CIF.ban(ni, "crasher");
        return main_1.CIF.detect(ni, "crasher", "Illegal Position");
    }
    ;
});
event_1.events.packetBefore(packetids_1.MinecraftPacketIds.PlayerAuthInput).on((pkt, ni) => {
    if (pkt.pos.x > UINTMAX || pkt.pos.y > UINTMAX || pkt.pos.z > UINTMAX || pkt.moveX > UINTMAX || pkt.moveZ > UINTMAX) {
        main_1.CIF.ban(ni, "crasher");
        return main_1.CIF.detect(ni, "crasher", "Illegal Position");
    }
    ;
});
event_1.events.packetRaw(packetids_1.MinecraftPacketIds.ClientCacheBlobStatus).on((ptr, size, ni) => {
    if (ptr.readVarUint() >= 0xfff || ptr.readVarUint() >= 0xfff) {
        main_1.CIF.ban(ni, "DoS");
        return main_1.CIF.detect(ni, "DoS", "DoS using ClientCacheBlobStatus Packet");
    }
    ;
});
event_1.events.packetBefore(123).on((pkt, ni) => {
    const sound = pkt.sound;
    if (sound === 0) {
        main_1.CIF.ban(ni, "crasher");
        return main_1.CIF.detect(ni, "crasher", "Invalid LevelSoundPacket");
    }
    ;
    if (sound !== 42 && sound !== 43) {
        const pl = ni.getActor();
        const plname = pl.getNameTag();
        PPSsound[plname] = PPSsound[plname] ? PPSsound[plname] + 1 : 1;
        if (PPSsound[plname] > 39) {
            PPSsound[plname] = 0;
            return main_1.CIF.detect(ni, "Sound Spam", "Spamming Sound Packets");
        }
        ;
        setTimeout(async () => {
            PPSsound[plname]--;
        }, (1000));
    }
    ;
});
event_1.events.packetBefore(packetids_1.MinecraftPacketIds.ActorEvent).on((pkt, ni) => {
    const pl = ni.getActor();
    const plname = pl.getNameTag();
    PPSact[plname] = PPSact[plname] ? PPSact[plname] + 1 : 1;
    if (PPSact[plname] > 39) {
        PPSact[plname] = 0;
        return main_1.CIF.detect(ni, "Act Spam", "Spamming ActorEvent Packets");
    }
    ;
    setTimeout(async () => {
        PPSact[plname]--;
    }, (1000));
});
event_1.events.packetRaw(93).on((ptr, size, ni) => {
    const pl = ni.getActor();
    if (!pl)
        return common_1.CANCEL;
    if (pl.hasTag("CIFcanCrash"))
        return;
    pl.sendMessage("§l§c스킨을 적용하시려면 서버에 재접속 해주세요!");
    pl.playSound("random.break");
    return common_1.CANCEL;
});
//Thank you Mdisprgm
const Warns = {};
const receivePacket = prochacker_1.procHacker.hooking("?receivePacket@NetworkConnection@@QEAA?AW4DataStatus@NetworkPeer@@AEAV?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@AEAVNetworkHandler@@AEBV?$shared_ptr@V?$time_point@Usteady_clock@chrono@std@@V?$duration@_JU?$ratio@$00$0DLJKMKAA@@std@@@23@@chrono@std@@@5@@Z", nativetype_1.int32_t, null, networkidentifier_1.NetworkConnection, pointer_1.CxxStringWrapper, networkidentifier_1.NetworkHandler, core_1.VoidPointer)((conn, data, networkHandler, time_point) => {
    const address = conn.networkIdentifier.getAddress();
    const id = data.valueptr.getUint8();
    if (Warns[address] > 1 || id === packetids_1.MinecraftPacketIds.PurchaseReceipt) {
        conn.disconnect();
        return 1;
    }
    if (id === 0) {
        Warns[address] = Warns[address] ? Warns[address] + 1 : 1;
    }
    return receivePacket(conn, data, networkHandler, time_point);
});
event_1.events.networkDisconnected.on(ni => {
    Warns[ni.getAddress()] = 0;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Jhc2hlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNyYXNoZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSxrRUFBK0U7QUFDL0Usa0RBQXdEO0FBRXhELHdDQUFxQztBQUNyQyxvQ0FBd0M7QUFDeEMsc0NBQW9DO0FBQ3BDLGdEQUEwQztBQUMxQywwQ0FBZ0Q7QUFDaEQsZ0RBQTZDO0FBQzdDLGtDQUE4QjtBQUU5QixNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUM7QUFFM0IsTUFBTSxRQUFRLEdBQTJCLEVBQUUsQ0FBQztBQUM1QyxNQUFNLE1BQU0sR0FBMkIsRUFBRSxDQUFDO0FBRTFDLGNBQU0sQ0FBQyxZQUFZLENBQUMsOEJBQWtCLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFO0lBQzlELElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLEVBQUU7UUFDbkUsVUFBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDdkIsT0FBTyxVQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxTQUFTLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztLQUN4RDtJQUFBLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQztBQUVILGNBQU0sQ0FBQyxZQUFZLENBQUMsOEJBQWtCLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFO0lBQ25FLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsT0FBTyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLE9BQU8sSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsR0FB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