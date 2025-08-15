import Vue from "vue";

export declare class SuspendedBallChat extends Vue {
    // Data
    private ballLeft: number;
    private ballTop: number;
    private isDragging: boolean;
    private startX: number;
    private startY: number;
    private offsetX: number;
    private offsetY: number;
    private isMenuVisible: boolean;
    private menuLeft: number;
    private menuTop: number;
    private clickThreshold: number;
    private menuWidth: number;
    private menuHeight: number;
    private minEdgeDistance: number;

    // Methods
    private handleMouseDown(event: MouseEvent): void;

    private handleMouseMove(event: MouseEvent): void;

    private handleMouseUp(): void;

    private toggleMenu(): void;

    private updateMenuPosition(): void;

    // Refs
    $refs: {
        floatingBall: HTMLElement;
    };
}
