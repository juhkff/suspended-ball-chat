<template>
  <div>
    <!-- 悬浮球 -->
    <div class="chat-bubble" ref="floatingBall" :style="{ left: ballLeft + 'px', top: ballTop + 'px' }"
         @mousedown="handleMouseDown">
      <!--   TODO   <img :src="aiAssistantIcon" alt="ai助手"/>-->
      <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"
           width="200" height="200">
        <path
            d="M717.12 274H762c82.842 0 150 67.158 150 150v200c0 82.842-67.158 150-150 150H262c-82.842 0-150-67.158-150-150V424c0-82.842 67.158-150 150-150h44.88l-18.268-109.602c-4.086-24.514 12.476-47.7 36.99-51.786 24.514-4.086 47.7 12.476 51.786 36.99l20 120c0.246 1.472 0.416 2.94 0.516 4.398h228.192c0.1-1.46 0.27-2.926 0.516-4.398l20-120c4.086-24.514 27.272-41.076 51.786-36.99 24.514 4.086 41.076 27.272 36.99 51.786L717.12 274zM308 484v40c0 24.852 20.148 45 45 45S398 548.852 398 524v-40c0-24.852-20.148-45-45-45S308 459.148 308 484z m318 0v40c0 24.852 20.148 45 45 45S716 548.852 716 524v-40c0-24.852-20.148-45-45-45S626 459.148 626 484zM312 912c-24.852 0-45-20.148-45-45S287.148 822 312 822h400c24.852 0 45 20.148 45 45S736.852 912 712 912H312z"
            fill="#13227a"/>
      </svg>
    </div>
    <!-- 菜单 -->
    <div class="menu" v-show="isMenuVisible"
         :style="{ left: (menuLeft-10) + 'px', top: menuTop + 'px' }">
      <chat-panel :app-name="appName" :domain-name="domainName" :locales="locales" :options="options" :url="url"/>
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
  @Prop({type: [String, Array], default: 'zh-CN'}) readonly locales!: string | string[];
  @Prop({
    type: Object, default: () => DEFAULT_DATE_TIME_FORMAT
  }) readonly options!: Intl.DateTimeFormatOptions;
  @Prop({type: String, default: '/nlweb/query'}) readonly url!: string;
  @Prop({type: String, required: true}) readonly appName!: string;
  @Prop({type: String, required: true}) readonly domainName!: string;

  private ballLeft: number = window.innerWidth - 60; // 初始位置
  private ballTop: number = window.innerHeight - 60;
  private isDragging: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private isMenuVisible: boolean = false;
  private menuLeft: number = 0;
  private menuTop: number = 0;
  private clickThreshold: number = 5; // 点击判断阈值
  private menuWidth: number = 350;
  private menuHeight: number = 500;
  private minEdgeDistance: number = 10; // 距离边缘最小距离

  mounted() {
    window.addEventListener("resize", this.handleWindowResize);
  }

  beforeDestroy() {
    window.removeEventListener("resize", this.handleWindowResize);
  }

  private handleWindowResize(): void {
    // 重新计算悬浮球位置，确保不会超出边界
    this.ballLeft = Math.max(
        this.minEdgeDistance,
        Math.min(this.ballLeft, window.innerWidth - 60 - this.minEdgeDistance)
    );
    this.ballTop = Math.max(
        this.minEdgeDistance,
        Math.min(this.ballTop, window.innerHeight - 60 - this.minEdgeDistance)
    );
    // 如果菜单可见，重新计算菜单位置
    if (this.isMenuVisible) {
      this.updateMenuPosition();
    }
    // 应用吸壁效果
    this.applyMagneticEffect();
  }

  private applyMagneticEffect(): void {
    // 应用吸壁效果，考虑最小边缘距离
    this.ballLeft = this.ballLeft < window.innerWidth / 2
        ? this.minEdgeDistance
        : window.innerWidth - 60 - this.minEdgeDistance;
  }

  handleMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isDragging = false;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.offsetX = this.ballLeft;
    this.offsetY = this.ballTop;
    document.addEventListener("mousemove", this.handleMouseMove);
    document.addEventListener("mouseup", this.handleMouseUp);
    // 拖动时移除过渡效果
    const ball = this.$refs.floatingBall as HTMLElement;
    ball.style.transition = "none";
  }

  handleMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      const dx = event.clientX - this.startX;
      const dy = event.clientY - this.startY;
      this.ballLeft = this.offsetX + dx;
      this.ballTop = this.offsetY + dy;
      // 边界处理，考虑最小边缘距离
      this.ballLeft = Math.max(
          this.minEdgeDistance,
          Math.min(this.ballLeft, window.innerWidth - 60 - this.minEdgeDistance)
      );
      this.ballTop = Math.max(
          this.minEdgeDistance,
          Math.min(this.ballTop, window.innerHeight - 60 - this.minEdgeDistance)
      );

      // 更新菜单位置
      if (this.isMenuVisible) {
        this.updateMenuPosition();
      }
    } else {
      const dx = Math.abs(event.clientX - this.startX);
      const dy = Math.abs(event.clientY - this.startY);
      if (dx > this.clickThreshold || dy > this.clickThreshold) {
        this.isDragging = true;
      }
    }
  }

  handleMouseUp() {
    document.removeEventListener("mousemove", this.handleMouseMove);
    document.removeEventListener("mouseup", this.handleMouseUp);
    if (!this.isDragging) {
      this.toggleMenu();
    }
    // 吸壁效果，考虑最小边缘距离
    const targetLeft =
        this.ballLeft < window.innerWidth / 2
            ? this.minEdgeDistance
            : window.innerWidth - 60 - this.minEdgeDistance;

    // 添加过渡效果
    const ball = this.$refs.floatingBall as HTMLElement;
    ball.style.transition = "left 0.3s ease";
    this.ballLeft = targetLeft;

    // 吸壁后更新菜单位置
    if (this.isMenuVisible) {
      this.updateMenuPosition();
    }
    this.isDragging = false;
  }

  toggleMenu() {
    this.isMenuVisible = !this.isMenuVisible;
    this.updateMenuPosition();
  }

  updateMenuPosition() {
    let left = 0;
    let top = 0;
    if (
        this.ballLeft + this.menuWidth >
        window.innerWidth - this.minEdgeDistance
    ) {
      // 悬浮球在右边，菜单显示在左边
      left = this.ballLeft - this.menuWidth;
    } else {
      // 悬浮球在左边，菜单显示在右边
      left = this.ballLeft + 80;
    }
    // 处理垂直方向菜单超出屏幕的情况
    if (
        this.ballTop + this.menuHeight >
        window.innerHeight - this.minEdgeDistance
    ) {
      // 若菜单底部超出屏幕，将菜单向上偏移
      top = Math.max(
          this.minEdgeDistance,
          window.innerHeight - this.menuHeight - this.minEdgeDistance
      );
    } else {
      top = this.ballTop;
    }
    this.menuLeft = left;
    this.menuTop = top;
  }
}
</script>

<style scoped>
.chat-bubble {
  position: fixed;
  width: 50px;
  height: 50px;
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

.menu {
  display: flex;
  flex-direction: column-reverse;
  overflow: auto;
  position: fixed;
  width: 350px;
  height: 500px;
  background: #ffffff;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 9999;
}

.chat-iframe {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 10px;
}
</style>
