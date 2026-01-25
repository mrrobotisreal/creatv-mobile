import type { ComponentType } from "react";

declare module "@react-native-masked-view/masked-view" {
  const MaskedView: ComponentType<any>;
  export default MaskedView;
}

declare module "expo-linear-gradient" {
  export const LinearGradient: ComponentType<any>;
}

