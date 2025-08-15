import Vue from 'vue';
import ChatPanel from "./chat-panel";
import {SuspendedBallChat} from "./suspended-ball-chat";

const components: { [propsName: string]: any } = {
    'chat-panel': ChatPanel,
    'suspended-ball-chat': SuspendedBallChat,
};

const install = (vue: typeof Vue): void => {
    // 安装全部的插件
    Object.keys(components).forEach((key) => {
        vue.component(key, components[key]);
    });
};

// 自动安装
if (typeof window !== 'undefined' && window.Vue) {
    install(window.Vue);
}

export {
    install,
    ChatPanel,
    SuspendedBallChat,
};

export default {
    install,
    ChatPanel,
    SuspendedBallChat,
}
