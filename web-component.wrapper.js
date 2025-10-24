/**
 * web-component.wrapper.js
 * @description: 创建 web 组件：如果需要在react、html框架中使用该组件，需要使用此文件将组件打包为 web 组件，通过导入生产的js和css文件即可使用组件标签
 */
import Vue from 'vue'
import SuspendBallChat from './components/suspended-ball-chat/SuspendedBallChat.vue'
import 'element-ui/lib/theme-chalk/index.css' // Element UI 样式

class SuspendedBallChatElement extends HTMLElement {
    connectedCallback() {
        if (this._mounted) return
        this._mounted = true

        const shadowRoot = this.attachShadow({mode: 'open'})
        const mountPoint = document.createElement('div')
        shadowRoot.appendChild(mountPoint)

        // 🔹 读取 HTML 属性
        const propsData = {}
        Array.from(this.attributes).forEach(attr => {
            // HTML 属性名带 - 需要转驼峰，或者直接用 attr.name
            const key = attr.name.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
            propsData[key] = attr.value
        })

        new Vue({
            render: h => h(SuspendBallChat, {props: propsData})
        }).$mount(mountPoint)

        // 注入样式
        Array.from(document.head.querySelectorAll('style')).forEach(s => shadowRoot.appendChild(s.cloneNode(true)))
        Array.from(document.head.querySelectorAll('link[rel="stylesheet"]')).forEach(l => shadowRoot.appendChild(l.cloneNode(true)))
    }
}


window.customElements.define('suspended-ball-chat', SuspendedBallChatElement)
