declare module '*.vue' {
  import Vue from 'vue'
  export default Vue
}

// types/element-ui.d.ts
declare module "element-ui/lib/transitions/collapse-transition" {
  import { Component } from "vue";
  const ElCollapseTransition: Component;
  export default ElCollapseTransition;
}
