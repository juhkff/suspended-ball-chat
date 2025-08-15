import Vue from "vue";
import { ChatMessage } from "types/common";

export declare class ChatPanel extends Vue {
    // Props
    readonly locales: string | string[];
    readonly options: Intl.DateTimeFormatOptions;
    readonly url: string;

    // Data
    private inputValue: string;
    private uiHistory: ChatMessage[];
    private history: ChatMessage[];
    private locked: boolean;

    // Methods
    private sendChatMessage(): void;
    private onEnter(event: KeyboardEvent): void;
    private onTab(event: KeyboardEvent): void;

    // Slots
    $slots: {
        default?: Vue.VNode[];
    };
}
