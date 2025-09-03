<template>
  <div>
    <!-- 悬浮球 -->
    <div class="chat-bubble" ref="suspendedBall" @mousedown="handleMouseDown"
         :style="{ left: ballLeft + 'px', top: ballTop + 'px', width: radius * 2 + 'px', height: radius * 2 + 'px' }">
      <!--   TODO   <img :src="aiAssistantIcon" alt="ai助手"/>-->
      <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M717.12 274H762c82.842 0 150 67.158 150 150v200c0 82.842-67.158 150-150 150H262c-82.842 0-150-67.158-150-150V424c0-82.842 67.158-150 150-150h44.88l-18.268-109.602c-4.086-24.514 12.476-47.7 36.99-51.786 24.514-4.086 47.7 12.476 51.786 36.99l20 120c0.246 1.472 0.416 2.94 0.516 4.398h228.192c0.1-1.46 0.27-2.926 0.516-4.398l20-120c4.086-24.514 27.272-41.076 51.786-36.99 24.514 4.086 41.076 27.272 36.99 51.786L717.12 274zM308 484v40c0 24.852 20.148 45 45 45S398 548.852 398 524v-40c0-24.852-20.148-45-45-45S308 459.148 308 484z m318 0v40c0 24.852 20.148 45 45 45S716 548.852 716 524v-40c0-24.852-20.148-45-45-45S626 459.148 626 484zM312 912c-24.852 0-45-20.148-45-45S287.148 822 312 822h400c24.852 0 45 20.148 45 45S736.852 912 712 912H312z"
            fill="#13227a"/>
      </svg>
    </div>
    <div class="panel" v-show="isPanelVisible"
         :style="{ left: panelLeft + 'px', top: panelTop + 'px', width: currentPanelWidth + 'px', height: currentPanelHeight + 'px' }">
      <!-- 调整面板结构，将resize控制区与内容区分离 -->
      <div class="resize-controls">
        <div class="resize-top" @mousedown="resizeTop"/>
        <div class="resize-bottom" @mousedown="resizeBottom"/>
        <div class="resize-left" @mousedown="resizeLeft"/>
        <div class="resize-right" @mousedown="resizeRight"/>
        <!-- 新增四个角落调整区域 -->
        <div class="resize-top-left" @mousedown="resizeTopLeft"/>
        <div class="resize-top-right" @mousedown="resizeTopRight"/>
        <div class="resize-bottom-left" @mousedown="resizeBottomLeft"/>
        <div class="resize-bottom-right" @mousedown="resizeBottomRight"/>
      </div>
      <div class="panel-content">
        <chat-panel class="chat-panel" :app-name="appName" :domain-name="domainName" :locales="dateLocales"
                    :options="options" :is-left="isLeft"
                    :url="url"/>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Component from "vue-class-component";
import Vue from "vue";
import ChatPanel from "../chat-panel";
import {Prop} from "vue-property-decorator";
import {DEFAULT_DATE_TIME_FORMAT} from "@/constants/dateFormats";

@Component({
  name: "suspended-ball-chat",
  components: {
    ChatPanel: ChatPanel,
  },
})
export default class SuspendBallChat extends Vue {
  @Prop({type: Number, default: 25}) readonly radius!: number;
  @Prop({type: Number, default: 350}) panelWidth!: number;
  @Prop({type: Number, default: 500}) panelHeight!: number;
  @Prop({type: [String, Array], default: 'zh-CN'}) readonly dateLocales!: string | string[];
  @Prop({
    type: String,
    default: 'right-bottom',
    validator: (value: string) => ['left-top', 'right-top', 'left-bottom', 'right-bottom'].includes(value)
  }) readonly location!: 'left-top' | 'right-top' | 'left-bottom' | 'right-bottom';
  @Prop({
    type: Object, default: () => DEFAULT_DATE_TIME_FORMAT
  }) readonly options!: Intl.DateTimeFormatOptions;
  @Prop({type: String, default: '/nlweb/query'}) readonly url!: string;
  @Prop({type: String, required: true}) readonly appName!: string;
  @Prop({type: String, required: true}) readonly domainName!: string;
  @Prop({type: Boolean, default: false}) readonly isLeft!: boolean;

  private eventListeners: Array<[EventTarget, string, EventListenerOrEventListenerObject]> = [];
  private ballLeft: number = window.innerWidth - this.radius * 2; // 初始位置
  private ballTop: number = window.innerHeight - this.radius * 2;
  private isDragging: boolean = false;
  private mouseStartX: number = 0;
  private mouseStartY: number = 0;
  private startPositionX: number = 0;
  private startPositionY: number = 0;
  private isPanelVisible: boolean = false;
  private panelLeft: number = 0;
  private panelTop: number = 0;
  private currentPanelWidth: number = 350;
  private currentPanelHeight: number = 500;
  private readonly margin: number = 10;  // 悬浮球和页面之间的距离
  private readonly moveThreshold: number = 5; // 拖拽距离阈值，超过此值判断为拖拽而非点击
  private readonly minEdgeDistance: number = 20; // 距离边缘最小距离
  // 默认悬浮球在右边，菜单显示在左边
  private calculatePanelPosition: Function = () => {
    this.panelLeft = this.ballLeft - this.margin - this.currentPanelWidth;
  };
  // 重新初始化悬浮球位置，条件允许时默认在右下角，确保不会超出边界
  private recomputePosition = (): void => {
    this.ballLeft = Math.max(this.minEdgeDistance, window.innerWidth - this.radius * 2 - this.minEdgeDistance);
    this.ballTop = Math.max(this.minEdgeDistance, window.innerHeight - this.radius * 2 - this.minEdgeDistance);
  }
  private panelStartWidth: number = 0;
  private panelStartHeight: number = 0;

  constructor() {
    super();
    this.resizePanelTop = this.resizePanelTop.bind(this);
    this.stopPanelResizeTop = this.stopPanelResizeTop.bind(this);
    this.resizePanelBottom = this.resizePanelBottom.bind(this);
    this.stopPanelResizeBottom = this.stopPanelResizeBottom.bind(this);
    this.resizePanelLeft = this.resizePanelLeft.bind(this);
    this.stopPanelResizeLeft = this.stopPanelResizeLeft.bind(this);
    this.resizePanelRight = this.resizePanelRight.bind(this);
    this.stopPanelResizeRight = this.stopPanelResizeRight.bind(this);
    this.resizePanelTopLeft = this.resizePanelTopLeft.bind(this);
    this.stopPanelResizeTopLeft = this.stopPanelResizeTopLeft.bind(this);
    this.resizePanelTopRight = this.resizePanelTopRight.bind(this);
    this.stopPanelResizeTopRight = this.stopPanelResizeTopRight.bind(this);
    this.resizePanelBottomLeft = this.resizePanelBottomLeft.bind(this);
    this.stopPanelResizeBottomLeft = this.stopPanelResizeBottomLeft.bind(this);
    this.resizePanelBottomRight = this.resizePanelBottomRight.bind(this);
    this.stopPanelResizeBottomRight = this.stopPanelResizeBottomRight.bind(this);
  }

  mounted() {
    switch (this.location) {
      case "left-top":
        this.recomputePosition = (): void => {
          this.ballLeft = this.margin;
          this.ballTop = this.margin;
        }
        break;
      case "right-top":
        this.recomputePosition = (): void => {
          this.ballLeft = Math.max(this.minEdgeDistance, window.innerWidth - this.radius * 2 - this.minEdgeDistance);
          this.ballTop = this.margin;
        }
        break;
      case "left-bottom":
        this.recomputePosition = (): void => {
          this.ballLeft = this.margin;
          this.ballTop = Math.max(this.minEdgeDistance, window.innerHeight - this.radius * 2 - this.minEdgeDistance);
        }
        break;
      case "right-bottom":
        this.recomputePosition = (): void => {
          this.ballLeft = Math.max(this.minEdgeDistance, window.innerWidth - this.radius * 2 - this.minEdgeDistance);
          this.ballTop = Math.max(this.minEdgeDistance, window.innerHeight - this.radius * 2 - this.minEdgeDistance);
        }
        break;
    }
    this.currentPanelWidth = this.panelWidth;
    this.currentPanelHeight = this.panelHeight;
    window.addEventListener("resize", this.handleWindowResize);
    this.handleWindowResize();
    // 全局兜底
    document.addEventListener("mouseleave", this.removeAllEvents);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.removeAllEvents();
      }
    });
  }

  private addEvent<K extends keyof DocumentEventMap>(el: Document, type: K, handler: (this: Document, ev: DocumentEventMap[K]) => any) {
    el.addEventListener(type, handler);
    this.eventListeners.push([el, type, handler as EventListener]);
  }

  private removeEvent<K extends keyof DocumentEventMap>(el: Document, type: K, handler: (this: Document, ev: DocumentEventMap[K]) => any) {
    el.removeEventListener(type, handler);
    this.eventListeners = this.eventListeners.filter(
        ([_el, _type, _handler]) => !(_el === el && _type === type && _handler === handler)
    );
  }

  private removeAllEvents() {
    this.eventListeners.forEach(([el, type, handler]) => {
      el.removeEventListener(type, handler);
    });
    this.eventListeners = [];
  }

  beforeDestroy() {
    window.removeEventListener("resize", this.handleWindowResize);
    document.removeEventListener("mouseleave", this.removeAllEvents);
    document.removeEventListener("visibilitychange", this.removeAllEvents);
    this.removeAllEvents();
  }

  private resizeTop(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.mouseStartY = event.clientY
    this.panelStartHeight = this.currentPanelHeight

    this.addEvent(document, "mousemove", this.resizePanelTop);
    this.addEvent(document, "mouseup", this.stopPanelResizeTop);
  }

  private resizeBottom(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.mouseStartY = event.clientY
    this.panelStartHeight = this.currentPanelHeight

    this.addEvent(document, "mousemove", this.resizePanelBottom);
    this.addEvent(document, "mouseup", this.stopPanelResizeBottom);
  }

  private resizeLeft(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.mouseStartX = event.clientX
    this.panelStartWidth = this.currentPanelWidth

    this.addEvent(document, 'mousemove', this.resizePanelLeft);
    this.addEvent(document, 'mouseup', this.stopPanelResizeLeft);
  }

  private resizeRight(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.mouseStartX = event.clientX
    this.panelStartWidth = this.currentPanelWidth

    this.addEvent(document, 'mousemove', this.resizePanelRight);
    this.addEvent(document, 'mouseup', this.stopPanelResizeRight);
  }

  private resizeTopLeft(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.mouseStartX = event.clientX;
    this.mouseStartY = event.clientY;
    this.panelStartWidth = this.currentPanelWidth;
    this.panelStartHeight = this.currentPanelHeight;

    this.addEvent(document, 'mousemove', this.resizePanelTopLeft);
    this.addEvent(document, 'mouseup', this.stopPanelResizeTopLeft);
  }

  private resizeTopRight(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.mouseStartX = event.clientX;
    this.mouseStartY = event.clientY;
    this.panelStartWidth = this.currentPanelWidth;
    this.panelStartHeight = this.currentPanelHeight;

    this.addEvent(document, 'mousemove', this.resizePanelTopRight);
    this.addEvent(document, 'mouseup', this.stopPanelResizeTopRight);
  }

  private resizeBottomLeft(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.mouseStartX = event.clientX;
    this.mouseStartY = event.clientY;
    this.panelStartWidth = this.currentPanelWidth;
    this.panelStartHeight = this.currentPanelHeight;

    this.addEvent(document, 'mousemove', this.resizePanelBottomLeft);
    this.addEvent(document, 'mouseup', this.stopPanelResizeBottomLeft);
  }

  private resizeBottomRight(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.mouseStartX = event.clientX;
    this.mouseStartY = event.clientY;
    this.panelStartWidth = this.currentPanelWidth;
    this.panelStartHeight = this.currentPanelHeight;

    this.addEvent(document, 'mousemove', this.resizePanelBottomRight);
    this.addEvent(document, 'mouseup', this.stopPanelResizeBottomRight);
  }

  private resizePanelTop(event: MouseEvent): void {
    // Y轴和Panel高度是反的，所以是减法
    this.currentPanelHeight = this.panelStartHeight - (event.clientY - this.mouseStartY);
    this.updatePanelPosition();
  }

  private resizePanelBottom(event: MouseEvent): void {
    this.currentPanelHeight = this.panelStartHeight + (event.clientY - this.mouseStartY);
    this.updatePanelPosition();
  }

  private resizePanelLeft(event: MouseEvent): void {
    // 左框变动和Panel宽度是反的，所以是减法
    this.currentPanelWidth = this.panelStartWidth - (event.clientX - this.mouseStartX);
    this.updatePanelPosition();
  }

  private resizePanelRight(event: MouseEvent): void {
    this.currentPanelWidth = this.panelStartWidth + (event.clientX - this.mouseStartX);
    this.updatePanelPosition();
  }

  private resizePanelTopLeft(event: MouseEvent): void {
    this.currentPanelWidth = this.panelStartWidth - (event.clientX - this.mouseStartX);
    this.currentPanelHeight = this.panelStartHeight - (event.clientY - this.mouseStartY);
    this.updatePanelPosition();
  }

  private resizePanelTopRight(event: MouseEvent): void {
    this.currentPanelWidth = this.panelStartWidth + (event.clientX - this.mouseStartX);
    this.currentPanelHeight = this.panelStartHeight - (event.clientY - this.mouseStartY);
    this.updatePanelPosition();
  }

  private resizePanelBottomLeft(event: MouseEvent): void {
    this.currentPanelWidth = this.panelStartWidth - (event.clientX - this.mouseStartX);
    this.currentPanelHeight = this.panelStartHeight + (event.clientY - this.mouseStartY);
    this.updatePanelPosition();
  }

  private resizePanelBottomRight(event: MouseEvent): void {
    this.currentPanelWidth = this.panelStartWidth + (event.clientX - this.mouseStartX);
    this.currentPanelHeight = this.panelStartHeight + (event.clientY - this.mouseStartY);
    this.updatePanelPosition();
  }

  private stopPanelResizeTop(): void {
    this.removeEvent(document, 'mousemove', this.resizePanelTop);
    this.removeEvent(document, 'mouseup', this.stopPanelResizeTop);
  }

  private stopPanelResizeBottom(): void {
    this.removeEvent(document, 'mousemove', this.resizePanelBottom);
    this.removeEvent(document, 'mouseup', this.stopPanelResizeBottom);
  }

  private stopPanelResizeLeft(): void {
    this.removeEvent(document, 'mousemove', this.resizePanelLeft);
    this.removeEvent(document, 'mouseup', this.stopPanelResizeLeft);
  }

  private stopPanelResizeRight(): void {
    this.removeEvent(document, 'mousemove', this.resizePanelRight);
    this.removeEvent(document, 'mouseup', this.stopPanelResizeRight);
  }

  private stopPanelResizeTopLeft(): void {
    this.removeEvent(document, 'mousemove', this.resizePanelTopLeft);
    this.removeEvent(document, 'mouseup', this.stopPanelResizeTopLeft);
  }

  private stopPanelResizeTopRight(): void {
    this.removeEvent(document, 'mousemove', this.resizePanelTopRight);
    this.removeEvent(document, 'mouseup', this.stopPanelResizeTopRight);
  }

  private stopPanelResizeBottomLeft(): void {
    this.removeEvent(document, 'mousemove', this.resizePanelBottomLeft);
    this.removeEvent(document, 'mouseup', this.stopPanelResizeBottomLeft);
  }

  private stopPanelResizeBottomRight(): void {
    this.removeEvent(document, 'mousemove', this.resizePanelBottomRight);
    this.removeEvent(document, 'mouseup', this.stopPanelResizeBottomRight);
  }

  private handleWindowResize(): void {
    this.recomputePosition();
    // 如果菜单可见，重新计算菜单位置
    if (this.isPanelVisible) {
      this.updatePanelPosition();
    }
    // 应用吸壁效果
    this.applyMagneticEffect();
  }

  private applyMagneticEffect(): number {
    // 应用吸壁效果，考虑最小边缘距离
    this.ballLeft = (this.ballLeft + this.radius) < (window.innerWidth / 2)
        ? this.minEdgeDistance
        : window.innerWidth - this.radius * 2 - this.minEdgeDistance;
    return this.ballLeft;
  }

  handleMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isDragging = false;
    this.mouseStartX = event.clientX;
    this.mouseStartY = event.clientY;
    this.startPositionX = this.ballLeft;
    this.startPositionY = this.ballTop;
    this.addEvent(document, "mousemove", this.handleMouseMove);
    this.addEvent(document, "mouseup", this.handleMouseUp);
    // 拖动时移除过渡效果
    const ball = this.$refs.suspendedBall as HTMLElement;
    ball.style.transition = "none";
  }

  handleMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      const dx = event.clientX - this.mouseStartX;
      const dy = event.clientY - this.mouseStartY;
      this.ballLeft = this.startPositionX + dx;
      this.ballTop = this.startPositionY + dy;
      // 边界处理，考虑最小边缘距离
      this.ballLeft = Math.max(
          this.minEdgeDistance,
          Math.min(this.ballLeft, window.innerWidth - this.radius * 2 - this.minEdgeDistance)
      );
      this.ballTop = Math.max(
          this.minEdgeDistance,
          Math.min(this.ballTop, window.innerHeight - this.radius * 2 - this.minEdgeDistance)
      );

      // 更新菜单位置
      if (this.isPanelVisible) {
        this.updatePanelPosition();
      }
    } else {
      const dx = Math.abs(event.clientX - this.mouseStartX);
      const dy = Math.abs(event.clientY - this.mouseStartY);
      if (dx > this.moveThreshold || dy > this.moveThreshold) {
        this.isDragging = true;
      }
    }
  }

  handleMouseUp() {
    this.removeEvent(document, "mousemove", this.handleMouseMove);
    this.removeEvent(document, "mouseup", this.handleMouseUp)
    if (!this.isDragging) {
      this.toggleMenu();
    }
    // 吸壁效果，考虑最小边缘距离
    const targetLeft = this.applyMagneticEffect();

    // 添加过渡效果
    const ball = this.$refs.suspendedBall as HTMLElement;
    ball.style.transition = "left 0.3s ease, top 0.3s ease";
    this.ballLeft = targetLeft;

    // 吸壁后更新菜单位置
    if (this.isPanelVisible) {
      this.updatePanelPosition();
    }
    this.isDragging = false;
  }

  toggleMenu() {
    this.isPanelVisible = !this.isPanelVisible;
    this.updatePanelPosition();
  }

  updatePanelPosition() {
    if (this.ballLeft + this.radius * 2 + this.margin + this.currentPanelWidth > window.innerWidth - this.minEdgeDistance) {
      // 悬浮球在右边，菜单显示在左边
      this.calculatePanelPosition = () => {
        this.panelLeft = this.ballLeft - this.margin - this.currentPanelWidth;
      }
    } else if (this.ballLeft - this.margin - this.currentPanelWidth < this.minEdgeDistance) {
      // 悬浮球在左边，菜单显示在右边
      this.calculatePanelPosition = () => {
        this.panelLeft = this.ballLeft + this.radius * 2 + this.margin;
      }
    }
    // 不触边的话就遵循原有逻辑
    this.calculatePanelPosition();
    // 处理垂直方向菜单超出屏幕的情况
    if (this.ballTop + this.currentPanelHeight > window.innerHeight - this.minEdgeDistance) {
      // 若菜单底部超出屏幕，将菜单向上偏移
      this.panelTop = Math.max(this.minEdgeDistance, window.innerHeight - this.currentPanelHeight - this.minEdgeDistance);
    } else {
      this.panelTop = this.ballTop;
    }
  }
}
</script>

<style scoped>
.chat-bubble {
  position: fixed;
  background-color: #d1f2ff;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 9999;
  transition: left 0.3s ease;
}

.chat-bubble svg {
  width: 30px;
  height: 30px;
  user-select: none;
}

.panel {
  display: flex;
  flex-direction: column-reverse;
  overflow: hidden; /* 改为hidden */
  position: fixed;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 9999;
}

/* 内容区域可滚动 */
.panel-content {
  flex: 1;
  overflow: auto; /* 滚动条移到这里 */
  display: flex;
  flex-direction: column-reverse;
}

.resize-controls {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 确保不影响内容交互 */
  z-index: 10; /* 确保控制区域在内容之上 */
}

.resize-controls > div {
  pointer-events: auto; /* 重新启用控制区域的事件 */
}

.chat-iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 10px;
}

.resize-top {
  cursor: ns-resize;
  position: absolute;
  width: calc(100% - 32px);
  height: 5px;
  top: 0;
  left: 16px;
  z-index: 1;
}

.resize-bottom {
  cursor: ns-resize;
  position: absolute;
  width: calc(100% - 32px);
  height: 5px;
  bottom: 0;
  left: 16px;
  z-index: 1;
}

.resize-left {
  cursor: ew-resize;
  position: absolute;
  height: calc(100% - 32px);
  width: 5px;
  left: 0;
  top: 16px;
  z-index: 1;
}

.resize-right {
  cursor: ew-resize;
  position: absolute;
  height: calc(100% - 32px);
  width: 5px;
  right: 0;
  top: 16px;
  z-index: 1;
}

.chat-panel {
  transition: none;
}

.resize-top-left {
  cursor: nwse-resize;
  position: absolute;
  width: 16px;
  height: 16px;
  left: 0;
  top: 0;
  z-index: 1;
  background: transparent; /* 确保透明不遮挡 */
}

.resize-top-right {
  cursor: nesw-resize;
  position: absolute;
  width: 16px;
  height: 16px;
  right: 0;
  top: 0;
  z-index: 1;
  background: transparent; /* 确保透明不遮挡 */
}

.resize-bottom-left {
  cursor: nesw-resize;
  position: absolute;
  width: 16px;
  height: 16px;
  left: 0;
  bottom: 0;
  z-index: 1;
  background: transparent; /* 确保透明不遮挡 */
}

.resize-bottom-right {
  cursor: nwse-resize;
  position: absolute;
  width: 16px;
  height: 16px;
  right: 0;
  bottom: 0;
  z-index: 1;
  background: transparent; /* 确保透明不遮挡 */
}
</style>
