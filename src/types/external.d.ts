import type { ComponentType } from "react";

declare module "@react-native-masked-view/masked-view" {
  const MaskedView: ComponentType<any>;
  export default MaskedView;
}

declare module "expo-linear-gradient" {
  export const LinearGradient: ComponentType<any>;
}

declare module "expo-router/entry" {
  const ExpoRouterEntry: ComponentType<any>;
  export default ExpoRouterEntry;
}

