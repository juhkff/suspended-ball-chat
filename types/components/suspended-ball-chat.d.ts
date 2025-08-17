import Vue from "vue";

export declare class SuspendedBallChat extends Vue {
    // Data
    private ballLeft: number;
    private ballTop: number;
    private isDragging: boolean;
    private startX: number;
    private startY: number;
    private startPositionX: number;
    private startPositionY: number;
    private isPanelVisible: boolean;
    private panelLeft: number;
    private panelTop: number;
    private panelWidth: number;
    private panelHeight: number;
    private margin: number;
    private moveThreshold: number;
    private minEdgeDistance: number;

    // Methods
    private handleMouseDown(event: MouseEvent): void;

    private handleMouseMove(event: MouseEvent): void;

    private handleMouseUp(): void;

    private togglePanel(): void;

    private updatePanelPosition(): void;

    // Refs
    $refs: {
        floatingBall: HTMLElement;
    };
}
