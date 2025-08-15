<template>
  <div id="app">
    <suspended-ball-chat app-name="app.test.com" domain-name="juhkff" url="http://localhost:8081/nlweb/query"/>
  </div>
</template>

<script lang="ts">
import {Component, Vue} from 'vue-property-decorator';
import SuspendedBallChat from '../components/suspended-ball-chat';

@Component({
  name: 'App',
  components: {
    SuspendedBallChat: SuspendedBallChat
  }
})
export default class App extends Vue {
}
</script>
<style scoped></style>
