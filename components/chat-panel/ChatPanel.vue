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
// 按需导入样式
import 'element-ui/lib/theme-chalk/button.css';
import 'element-ui/lib/theme-chalk/card.css';
import 'element-ui/lib/theme-chalk/divider.css';
import 'element-ui/lib/theme-chalk/input.css';
import 'element-ui/lib/theme-chalk/row.css';
import 'element-ui/lib/theme-chalk/col.css';
import 'element-ui/lib/theme-chalk/icon.css';

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

  constructor() {
    super();
    this.converter = new showdown.Converter();
    this.converter.setFlavor('github');
    this.converter.setOption('openLinksInNewWindow', true);
    this.fetchPromise = null;
    this.controller = null;
    if (this.uiHistory.length === 0) {
      this.uiHistory.push({
        role: 'assistant',
        content: this.converter.makeHtml('你好，欢迎使用聊天机器人！请问有什么我可以帮助你的吗？'),
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
    if (this.locked) {
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
}
</script>

<template>
  <div>
    <el-row style="display: flex; flex-direction: column;">
      <el-col v-for="(item, index) in this.uiHistory" :key="index" :class="`card-col ${item.role}`">
        <el-card :class="`message-card ${item.role}`">
          <el-row v-if="item.role !== 'wait' && item.role !== 'error'"
                  v-text="new Date(item.timestamp).toLocaleString(locales, options)"
                  :class="`card-panel-timestamp ${item.role}`" type="flex"/>
          <el-row v-if="item.role !=='wait' && item.role !=='error'" v-html="item.content"
                  :class="`message-content ${item.role}`" justify="start"/>
          <!-- 如果是wait则显示加载条 -->
          <el-row v-if="item.role === 'wait'" :class="`message-content ${item.role}`">
            <i class="el-icon-loading"/>
            <p style="display: inline-block">思考中...</p>
          </el-row>
          <!-- 如果是error则显示错误信息 -->
          <el-row v-if="item.role === 'error'" :class="`message-content ${item.role}`"
                  style="color: orange; font-weight: bold;">
            <i class="el-icon-error"/>
            <p style="display: inline-block;" v-text="item.content"/>
          </el-row>
        </el-card>
      </el-col>
    </el-row>
    <el-divider class="input-top-divider"/>
    <el-card class="input-card">
      <slot>
        <el-input type="textarea" autosize clearable resize="none" style="flex: 1" class="card-input"
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
          <svg v-if="locked" t="1755251798606" class="icon" viewBox="0 0 1024 1024" version="1.1"
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
  margin-right: 5%;
}

.message-card.assistant,
.message-card.wait,
.message-card.error {
  background-color: #4E8CFF;
  margin-left: 5%;
}

.card-col {
  display: flex;
}

.card-col.user {
  justify-content: flex-start;
}

.card-col.assistant,
.card-col.wait,
.card-col.error {
  justify-content: flex-end;
}

.card-panel-timestamp {
  margin-bottom: 5px;
  color: gray;
  font-size: 12px;
}

.card-panel-timestamp.user {
  justify-content: flex-start;
}

.card-panel-timestamp.assistant,
.card-panel-timestamp.wait,
.card-panel-timestamp.error {
  justify-content: flex-end;
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
}

.message-content {
  padding: 0;
  text-align: left;
  text-indent: 0;
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

.message-content.wait p {
  padding: 0 5px 0 5px;
  opacity: 0.5;
}

.message-content.error p {
  padding: 0 5px 0 5px;
}
</style>
