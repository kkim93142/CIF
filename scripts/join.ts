import { MinecraftPacketIds } from "bdsx/bds/packetids";
import { BuildPlatform } from "bdsx/common";
import { events } from "bdsx/event";
import { bedrockServer } from "bdsx/launcher";
import { CIF } from "../main";

enum TitleId {
    ANDROID = 1739947436,
    IOS = 1810924247,
    WINDOWS_10 = 896928775,
    PLAYSTATION = 2044456598,
    NINTENDO = 2047319603,
    XBOX = 1828326430,
}

events.packetAfter(MinecraftPacketIds.Login).on((pkt, ni) => {
    if (pkt.connreq === null) return;
    const deviceId = pkt.connreq.getDeviceId();
    const deviceOS = pkt.connreq.getDeviceOS();
    const cert = pkt.connreq.getCertificate();
    const name = cert.getId();
    const ip = ni.getAddress();
    const xuid = cert.getXuid()
    const model = pkt.connreq.getJsonValue()!.DeviceModel;

    const invisibleChars = ["⠀", " ", " ", " ", "　", " ", " ", " ", " ", "﻿", " ", " ", "󠀠", " ", " ", "​", " "];
    if (name.length > 20) {
        CIF.detect(ni, "Long nick name", "Your name is too long");
    }

    for (let i = 0; i < invisibleChars.length; i++) {
        const char = invisibleChars[i];
        if (name.includes(char)) {
            CIF.detect(ni, "Invisible nick name", "Your name has invisible characters");
            return;
        }
    }

    console.log(`Connection ${name} \nIP=${ip}\nOS=${BuildPlatform[deviceOS]}\nDevice Model=${model.trim().length === 0 ? "null" : model}\nDeviceId=${deviceId}\nXUID=${xuid || "Guest"}`.green);

    const brand = model.split(" ")[0];
    const titleId = cert.json.value()["extraData"]["titleId"];
    const system = pkt.connreq.getJsonValue()!["DeviceOS"];
    if (TitleId[titleId] && TitleId[BuildPlatform[system] as any] != titleId) {
        CIF.detect(ni, "Edition Faker", "Faked Edition Detected");
    }
    if (titleId === TitleId.ANDROID && brand.toUpperCase() !== brand) {
        CIF.detect(ni, "Tool Box", "You are using Tool Box");
    }

    // if(model.search(/[a-z]/) !== -1){
    //     kick(ni,"§cTool booooooooox");
    // }
});