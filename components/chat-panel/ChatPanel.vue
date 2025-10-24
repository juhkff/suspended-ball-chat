<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';
import {Prop} from "vue-property-decorator";
import {DEFAULT_DATE_TIME_FORMAT} from "@/constants/dateFormats"
import _ from 'lodash';
import showdown, {Converter} from "showdown";
// 按需导入 Element UI 组件和样式
import {
  Button,
  Card,
  Divider,
  Input,
  Row,
  Col,
} from 'element-ui';
import {ChatMessage} from 'types';
import {Role} from "../../types/common";
// 按需导入样式
import 'element-ui/lib/theme-chalk/button.css';
import 'element-ui/lib/theme-chalk/card.css';
import 'element-ui/lib/theme-chalk/divider.css';
import 'element-ui/lib/theme-chalk/input.css';
import 'element-ui/lib/theme-chalk/row.css';
import 'element-ui/lib/theme-chalk/col.css';

@Component({
  name: 'chat-panel',
  components: {
    'el-row': Row,
    'el-col': Col,
    'el-card': Card,
    'el-divider': Divider,
    'el-input': Input,
    'el-button': Button,
  }
})
export default class ChatPanel extends Vue {
  @Prop({type: [String, Array], default: 'zh-CN'}) readonly locales!: string | string[];
  @Prop({
    type: Object, default: () => DEFAULT_DATE_TIME_FORMAT
  }) readonly options!: Intl.DateTimeFormatOptions;
  @Prop({type: String, required: true}) readonly url!: string;
  @Prop({type: String, required: true}) readonly appName!: string;
  @Prop({type: String, required: true}) readonly domainName!: string;
  // 控制用户信息显示在左边还是右边
  @Prop({type: Boolean, default: false}) readonly isLeft!: boolean;

  constructor() {
    super();
    this.converter = new showdown.Converter();
    this.converter.setFlavor('github');
    this.converter.setOption('openLinksInNewWindow', true);
    this.fetchPromise = null;
    this.controller = null;
  }

  private mounted() {
    if (this.uiHistory.length === 0) {
      this.uiHistory.push({
        role: 'assistant',
        content: this.locales === 'zh-CN' ? this.converter.makeHtml('你好，欢迎使用聊天机器人！请问有什么我可以帮助你的吗？') : this.converter.makeHtml('Hello, welcome to the chatbot! How can I help you?'),
        timestamp: Date.now()
      });
    }
  }

  private converter: Converter;
  private inputValue: string = ''
  // uiHistory 提供UI界面展示数据. 因为存在一种情况：用户发送消息后，服务器返回错误，此时需要将用户消息和错误信息展示出来，但不存储到历史记录中
  private uiHistory: ChatMessage[] = []
  // 真正的历史记录
  private history: ChatMessage[] = []
  // 锁
  private locked: boolean = false;
  // 请求Promise
  private fetchPromise: Promise<Response> | null;
  private controller: AbortController | null;

  private processButtonClick() {
    if (!this.locked) this.sendChatMessage();
    else this.stopWaitingForAssistant();
  }

  private stopWaitingForAssistant() {
    if (this.fetchPromise) {
      // 清除所有role="wait"的项
      this.uiHistory = this.uiHistory.filter(item => item.role !== "wait");
      // 中断
      if (this.controller) this.controller.abort();
      this.fetchPromise = null;
      this.locked = false;
    }
  }

  private sendChatMessage() {
    if (this.locked || this.inputValue.trim() === '') {
      return;
    }
    this.locked = true;
    // copy防止用户改变inputValue导致存储内容变化
    const inputValueCopy = _.cloneDeep(this.inputValue);
    this.inputValue = '';
    if (!inputValueCopy.trim()) {
      return;
    }
    this.controller = new AbortController();
    this.fetchPromise = fetch(this.url, {
      signal: this.controller.signal,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // history: this.history,
        appName: this.appName,
        userId: this.domainName,
        query: inputValueCopy
      })
    });
    this.uiHistory.push({
      role: 'user',
      content: this.converter.makeHtml(inputValueCopy),
      timestamp: Date.now()
    });
    // 思考效果
    this.uiHistory.push({
      role: 'wait',
      content: 'thinking...',
      timestamp: -1,
    });
    const startTime = Date.now();
    this.scrollToBottom();
    this.fetchPromise.then(async (response) => {
      // await new Promise(resolve => setTimeout(resolve, 3000));  // 模拟3s延时
      const endTime = Date.now();
      const processTime = endTime - startTime;
      console.log(processTime);
      // 清除所有role="wait"的项
      this.uiHistory = this.uiHistory.filter(item => item.role !== "wait");
      const data = await response.json();
      if (response.ok) {
        const content = data.result.answer;
        const mdContent = this.converter.makeHtml(content);
        // 成功才存储对话内容
        this.history.push({
          role: 'user',
          content: inputValueCopy,
          timestamp: Date.now()
        });
        [this.uiHistory, this.history].forEach(arrayObj => {
          arrayObj.push({
            role: 'assistant',
            content: mdContent,
            timestamp: Date.now()
          });
        });
      } else {
        // TODO false的情况？
        this.uiHistory.push({
          role: "error",
          content: data.content,
          timestamp: Date.now()
        });
      }
    }).catch(error => {
      // 清除所有role="wait"的项
      this.uiHistory = this.uiHistory.filter(item => item.role !== "wait");
      this.uiHistory.push({
        role: "error",
        content: error.message,
        timestamp: Date.now()
      })
    }).finally(() => {
      this.locked = false;
    })
  }

  private onEnter(event: KeyboardEvent) {
    if (!event.ctrlKey) {
      event.preventDefault();
      this.sendChatMessage();
    } else {
      // ctrl + enter 换行
      const textarea = event.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      this.inputValue =
          this.inputValue.substring(0, start) +
          '\n' +
          this.inputValue.substring(end);
      this.$nextTick(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      });
      event.preventDefault();
    }
  }

  private onTab(event: KeyboardEvent) {
    const textarea = event.target as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    this.inputValue =
        this.inputValue.substring(0, start) +
        '\t' +
        this.inputValue.substring(end);
    this.$nextTick(() => {
      textarea.selectionStart = textarea.selectionEnd = start + 1;
    });
    event.preventDefault();
  }

  private async copyToClipboard(text: string) {
    try {
      // 首先尝试使用现代剪贴板API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // 降级到传统方法
        this.fallbackCopyTextToClipboard(text);
      }
    } catch (err) {
      console.error('Modern copy error:', err);
      // 出错时也尝试降级方法
      this.fallbackCopyTextToClipboard(text);
    }
  }

  // 传统复制方法
  private fallbackCopyTextToClipboard(text: string) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;

      // 避免滚动到底部
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (!successful) {
        console.error('Fallback copy failed');
      }
    } catch (err) {
      console.error('Fallback copy error:', err);
    }
  }

  // 添加一个辅助方法来提取纯文本
  private extractTextFromHtml(html: string): string {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  private computePosition(element: string, role: Role): string {
    if (element === 'card-col' || element === 'card-panel-timestamp') {
      if (this.isLeft) {
        return role === 'user' ? 'justify-content: flex-start;' : 'justify-content: flex-end;';
      } else {
        return role === 'user' ? 'justify-content: flex-end;' : 'justify-content: flex-start;';
      }
    } else if (element === 'message-card') {
      if (this.isLeft) {
        return role === 'user' ? 'margin-right: 5%;' : 'margin-left: 5%;';
      } else {
        return role === 'user' ? 'margin-left: 5%;' : 'margin-right: 5%;';
      }
    } else {
      return '';
    }
  }

  private scrollToBottom() {
    this.$nextTick(() => {
      const container = this.$el.querySelector('.messages-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }
}
</script>

<template>
  <div class="chat-container">
    <el-row class="messages-container">
      <el-col v-for="(item, index) in this.uiHistory" :key="index" :class="`card-col ${item.role}`"
              :style="computePosition('card-col', item.role)">
        <el-card :class="`message-card ${item.role}`" :style="computePosition('message-card', item.role)">
          <el-row v-if="item.role !== 'wait' && item.role !== 'error'"
                  :class="`card-panel-timestamp ${item.role}`" type="flex"
                  :style="computePosition('card-panel-timestamp', item.role)">
            <span>
              {{ new Date(item.timestamp).toLocaleString(locales, options) }}
            </span>
            <el-button
                title="copy"
                @click="copyToClipboard(extractTextFromHtml(item.content))"
                :class="`copy-button ${item.role}`"
                style="width: 14px; height: 14px; min-width: 14px; min-height: 14px; padding: 0;">
              <svg :class="`copy-svg ${item.role}`" viewBox="0 0 1024 1024"
                   xmlns="http://www.w3.org/2000/svg" width="12" height="13">
                <path
                    d="M838.4 68.266667h-512c-46.933333 0-85.333333 36.266667-85.333333 81.066666v38.4H185.6c-46.933333 0-85.333333 38.4-85.333333 85.333334v597.333333c0 46.933333 38.4 85.333333 85.333333 85.333333h512c46.933333 0 85.333333-38.4 85.333333-85.333333v-36.266667h55.466667c46.933333 0 85.333333-38.4 85.333333-85.333333v-597.333333c0-44.8-38.4-83.2-85.333333-83.2z m-98.133333 802.133333c0 23.466667-19.2 42.666667-42.666667 42.666667h-512c-23.466667 0-42.666667-19.2-42.666667-42.666667v-597.333333c0-23.466667 19.2-42.666667 42.666667-42.666667h512c23.466667 0 42.666667 19.2 42.666667 42.666667v597.333333z m140.8-119.466667c0 23.466667-19.2 42.666667-42.666667 42.666667h-55.466667V273.066667c0-46.933333-38.4-85.333333-85.333333-85.333334H283.733333V149.333333c0-21.333333 19.2-38.4 42.666667-38.4h512c23.466667 0 42.666667 19.2 42.666667 42.666667v597.333333z m-450.133334-83.2h-204.8c-12.8 0-21.333333 8.533333-21.333333 21.333334s8.533333 21.333333 21.333333 21.333333h204.8c12.8 0 21.333333-8.533333 21.333334-21.333333s-10.666667-21.333333-21.333334-21.333334z m98.133334-10.666666c-17.066667 0-32 14.933333-32 32s14.933333 32 32 32 32-14.933333 32-32-12.8-32-32-32z m128-234.666667H224c-12.8 0-21.333333 8.533333-21.333333 21.333333s8.533333 21.333333 21.333333 21.333334h433.066667c12.8 0 21.333333-8.533333 21.333333-21.333334s-8.533333-21.333333-21.333333-21.333333z"></path>
              </svg>
            </el-button>
          </el-row>
          <el-row v-if="item.role !=='wait' && item.role !=='error'" v-html="item.content"
                  :class="`message-content ${item.role}`" justify="start"/>
          <!-- 如果是wait则显示加载条 -->
          <el-row v-if="item.role === 'wait'" :class="`message-content ${item.role}`">
            <svg class="loading-svg" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"
                 width="16" height="16">
              <path
                  d="M511.882596 287.998081h-0.361244a31.998984 31.998984 0 0 1-31.659415-31.977309v-0.361244c0-0.104761 0.115598-11.722364 0.115598-63.658399V96.000564a31.998984 31.998984 0 1 1 64.001581 0V192.001129c0 52.586273-0.111986 63.88237-0.119211 64.337537a32.002596 32.002596 0 0 1-31.977309 31.659415zM511.998194 959.99842a31.998984 31.998984 0 0 1-31.998984-31.998984v-96.379871c0-51.610915-0.111986-63.174332-0.115598-63.286318s0-0.242033 0-0.361243a31.998984 31.998984 0 0 1 63.997968-0.314283c0 0.455167 0.11921 11.711527 0.11921 64.034093v96.307622a31.998984 31.998984 0 0 1-32.002596 31.998984zM330.899406 363.021212a31.897836 31.897836 0 0 1-22.866739-9.612699c-0.075861-0.075861-8.207461-8.370021-44.931515-45.094076L195.198137 240.429485a31.998984 31.998984 0 0 1 45.256635-45.253022L308.336112 263.057803c37.182834 37.182834 45.090463 45.253022 45.41197 45.578141A31.998984 31.998984 0 0 1 330.899406 363.021212zM806.137421 838.11473a31.901448 31.901448 0 0 1-22.628318-9.374279L715.624151 760.859111c-36.724054-36.724054-45.018214-44.859267-45.097687-44.93874a31.998984 31.998984 0 0 1 44.77618-45.729864c0.32512 0.317895 8.395308 8.229136 45.578142 45.411969l67.88134 67.88134a31.998984 31.998984 0 0 1-22.624705 54.630914zM224.000113 838.11473a31.901448 31.901448 0 0 0 22.628317-9.374279l67.88134-67.88134c36.724054-36.724054 45.021826-44.859267 45.097688-44.93874a31.998984 31.998984 0 0 0-44.776181-45.729864c-0.32512 0.317895-8.395308 8.229136-45.578142 45.411969l-67.88134 67.884953a31.998984 31.998984 0 0 0 22.628318 54.627301zM255.948523 544.058589h-0.361244c-0.104761 0-11.722364-0.115598-63.658399-0.115598H95.942765a31.998984 31.998984 0 1 1 0-64.00158h95.996952c52.586273 0 63.88237 0.111986 64.337538 0.11921a31.998984 31.998984 0 0 1 31.659414 31.97731v0.361244a32.002596 32.002596 0 0 1-31.988146 31.659414zM767.939492 544.058589a32.002596 32.002596 0 0 1-31.995372-31.666639v-0.361244a31.998984 31.998984 0 0 1 31.659415-31.970085c0.455167 0 11.754876-0.11921 64.34115-0.11921h96.000564a31.998984 31.998984 0 0 1 0 64.00158H831.944685c-51.936034 0-63.553638 0.111986-63.665624 0.115598h-0.335957zM692.999446 363.0176a31.998984 31.998984 0 0 1-22.863126-54.381656c0.317895-0.32512 8.229136-8.395308 45.41197-45.578141l67.88134-67.884953A31.998984 31.998984 0 1 1 828.693489 240.429485l-67.892177 67.88134c-31.020013 31.023625-41.644196 41.759794-44.241539 44.393262l-0.697201 0.722488a31.908673 31.908673 0 0 1-22.863126 9.591025z"
                  fill="#ffffff"></path>
            </svg>
            <p style="display: inline-block">思考中...</p>
          </el-row>
          <!-- 如果是error则显示错误信息 -->
          <el-row v-if="item.role === 'error'" :class="`message-content ${item.role}`"
                  style="color: orange; font-weight: bold;">
            <svg class="error-svg" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"
                 width="14" height="14">
              <path
                  d="M512 0C229.376 0 0 229.376 0 512s229.376 512 512 512 512-229.376 512-512S794.624 0 512 0z m218.624 672.256c15.872 15.872 15.872 41.984 0 57.856-8.192 8.192-18.432 11.776-29.184 11.776s-20.992-4.096-29.184-11.776L512 569.856l-160.256 160.256c-8.192 8.192-18.432 11.776-29.184 11.776s-20.992-4.096-29.184-11.776c-15.872-15.872-15.872-41.984 0-57.856L454.144 512 293.376 351.744c-15.872-15.872-15.872-41.984 0-57.856 15.872-15.872 41.984-15.872 57.856 0L512 454.144l160.256-160.256c15.872-15.872 41.984-15.872 57.856 0 15.872 15.872 15.872 41.984 0 57.856L569.856 512l160.768 160.256z"
                  fill="orange"></path>
            </svg>
            <p style="display: inline-block;" v-text="item.content"/>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
    <el-divider class="input-top-divider"/>
    <el-card class="input-card">
      <slot>
        <el-input type="textarea" autosize clearable resize="none" style="flex: 1;"
                  class="card-input"
                  placeholder="Type your message here..." @keydown.enter.native="onEnter" @keydown.tab.native="onTab"
                  v-model="inputValue"/>
        <el-button @click="processButtonClick" class="ball-chat-submit" circle="circle" size="small"
                   style="background: transparent; border: none;">
          <!-- 发送箭头 SVG 图标 -->
          <svg v-if="!locked" style="width: 16px; height: 16px; display: flex; align-items: center;" viewBox="0 0 24 24"
               fill="currentColor">
            <path d="M2,21L23,12L2,3V10L17,12L2,14V21Z"/>
          </svg>
          <!-- 停止按钮 SVG 图标 -->
          <svg v-if="locked" t="1755251798606" class="stop-svg" viewBox="0 0 1024 1024" version="1.1"
               xmlns="http://www.w3.org/2000/svg"
               p-id="8782" width="16" height="16">
            <path
                d="M512 0C230.4 0 0 230.4 0 512c0 281.6 230.4 512 512 512 117.76 0 227.84-38.4 320-110.08 10.24-7.68 12.8-23.04 5.12-35.84-7.68-10.24-23.04-12.8-35.84-5.12C719.36 939.52 616.96 972.8 512 972.8 256 972.8 51.2 768 51.2 512 51.2 256 256 51.2 512 51.2 768 51.2 972.8 256 972.8 512c0 87.04-25.6 171.52-69.12 243.2-7.68 12.8-2.56 28.16 7.68 33.28 12.8 7.68 28.16 2.56 33.28-7.68 51.2-79.36 76.8-174.08 76.8-271.36C1024 230.4 793.6 0 512 0z"
                p-id="8783" fill="#d81e06"></path>
            <path
                d="M686.08 307.2 337.92 307.2c-17.92 0-30.72 12.8-30.72 30.72l0 348.16c0 17.92 12.8 30.72 30.72 30.72l348.16 0c17.92 0 30.72-12.8 30.72-30.72L716.8 337.92C716.8 320 704 307.2 686.08 307.2zM665.6 657.92c0 5.12-2.56 7.68-7.68 7.68L366.08 665.6c-5.12 0-7.68-2.56-7.68-7.68L358.4 366.08c0-5.12 2.56-7.68 7.68-7.68l291.84 0c5.12 0 7.68 2.56 7.68 7.68L665.6 657.92z"
                p-id="8784" fill="#d81e06"></path>
          </svg>
        </el-button>
      </slot>
    </el-card>
  </div>
</template>

<style scoped>
.message-card {
  width: fit-content;
  border-radius: 5px;
  padding: 2px;
  margin: 5px;
  font-size: 14px;
}

.message-card ::v-deep .el-card__body {
  padding: 5px 10px;
}

.message-card.user {
  /*
  margin-right: 5%;
   */
}

.message-card.assistant,
.message-card.wait,
.message-card.error {
  background-color: #4E8CFF;
  /*
  margin-left: 5%;
  */
}

.card-col {
  display: flex;
}

.card-col.user {
  /*
  justify-content: flex-start;
   */
}

.card-col.assistant,
.card-col.wait,
.card-col.error {
  /*
  justify-content: flex-end;
   */
}

.card-panel-timestamp {
  margin-bottom: 5px;
  color: gray;
  font-size: 12px;
}

.card-panel-timestamp.user {
  /*
  justify-content: flex-start;
   */
}

.card-panel-timestamp.assistant,
.card-panel-timestamp.wait,
.card-panel-timestamp.error {
  /*
  justify-content: flex-end;
   */
  color: #d9d9d9;
}

.input-top-divider {
  margin-top: 10px;
  margin-bottom: 10px;
}

.input-card {
  margin: 10px;
  background-color: #f2f5f7;
  border-radius: 10px;
  flex-shrink: 0; /* 防止被压缩 */
}

.input-card ::v-deep .el-card__body {
  padding: 0 5px 0 15px;
  display: flex;
  justify-content: flex-start;
}

.card-input {
  display: flex;
  align-items: center;
}

.card-input ::v-deep .el-input__inner {
  padding: 0;
}

.card-input ::v-deep .el-textarea__inner {
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
  background-color: transparent;
  padding: 0;
  border: none;
  min-height: 21px !important;
  height: 21px !important;
}

.message-content {
  padding: 0;
  text-align: left;
  text-indent: 0;
  overflow: auto;
}

.message-content >>> p {
  margin-top: 0;
  margin-bottom: 0;
}

.message-content.assistant,
.message-content.wait,
.message-content.error {
  color: white;
}

.message-content.wait, .message-content.error {
  /* 居中 */
  display: flex;
  align-items: center;
  overflow: hidden;
}

.message-content.wait p {
  padding: 0 5px 0 5px;
  opacity: 0.5;
}

.message-content.error p {
  padding: 0 5px 0 5px;
}

.copy-button {
  background: transparent;
  border: none;
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px; /* 调整图标大小 */
  /* 位置调整 */
  margin-left: 3px;
  transform: translateY(1px);
}

.copy-svg.assistant,
.copy-svg.error {
  fill: rgba(255, 255, 255, 1);
}

.copy-svg.assistant:hover,
.copy-svg.error:hover {
  fill: rgb(0, 0, 0);
}

.copy-svg.user:hover {
  fill: deepskyblue;
}

.message-card:hover .copy-button {
  opacity: 1;
}

.chat-container {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-container {
  overflow: auto;
}

/* 给 svg 添加旋转动画 */
.loading-svg {
  animation: spin 1.5s linear infinite;
  transform-origin: center; /* 围绕中心旋转 */
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-svg path {
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    fill-opacity: 1;
  }
  50% {
    fill-opacity: 0.5;
  }
}

svg {
  flex-shrink: 0; /* 避免被 flex 拉伸 */
}
</style>
