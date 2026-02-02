import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNetInfo } from "@react-native-community/netinfo";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "../auth/authProvider";

type AuthMode = "signIn" | "signUp";

const signInSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signUpSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type SignInForm = z.infer<typeof signInSchema>;
type SignUpForm = z.infer<typeof signUpSchema>;

type GradientColors = readonly [string, string, ...string[]];

type GradientTextProps = {
  text: string;
  colors: GradientColors;
  style?: TextStyle;
};

function isValidComponent(component: unknown) {
  if (typeof component === "function") {
    return true;
  }
  if (typeof component === "object" && component !== null && "$$typeof" in (component as object)) {
    return true;
  }
  return false;
}

function GradientText({ text, colors, style }: GradientTextProps) {
  if (!isValidComponent(MaskedView) || !isValidComponent(LinearGradient)) {
    return <Text style={[style, styles.gradientFallback]}>{text}</Text>;
  }
  return (
    <MaskedView
      androidRenderingMode="software"
      maskElement={<Text style={[style, styles.gradientMask]}>{text}</Text>}
    >
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientContainer}>
        <Text style={[style, styles.gradientHidden]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [formError, setFormError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const netInfo = useNetInfo();
  const isOffline = useMemo(
    () => netInfo.isConnected === false || netInfo.isInternetReachable === false,
    [netInfo.isConnected, netInfo.isInternetReachable]
  );

  const schema = useMemo(() => (mode === "signIn" ? signInSchema : signUpSchema), [mode]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SignInForm | SignUpForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  const onToggleMode = useCallback(
    (next: AuthMode) => {
      setMode(next);
      reset({ email: "", password: "" });
      setFormError(null);
    },
    [reset]
  );

  const onSubmit = useCallback(
    async (values: SignInForm | SignUpForm) => {
      if (isOffline) {
        setFormError("You're offline. Connect to the internet to continue.");
        return;
      }

      setFormError(null);
      setAuthLoading(true);
      try {
        if (mode === "signIn") {
          await signIn(values.email, values.password);
        } else {
          await signUp(values.email, values.password);
        }
      } catch (error) {
        setFormError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      } finally {
        setAuthLoading(false);
      }
    },
    [isOffline, mode, signIn, signUp]
  );

  const onGooglePress = useCallback(async () => {
    if (isOffline) {
      setFormError("You're offline. Connect to the internet to continue.");
      return;
    }

    setFormError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setGoogleLoading(false);
    }
  }, [isOffline, signInWithGoogle]);

  const isBusy = isSubmitting || authLoading || googleLoading;
  const submitLabel = mode === "signIn" ? "Sign In" : "Sign Up";
  const googleLabel = mode === "signIn" ? "Sign In with Google" : "Sign Up with Google";

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 12 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        >
          <View style={styles.brandRow}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <View style={styles.brandTextRow}>
              <GradientText text="Crea" colors={GRADIENTS.crea} style={styles.brandText} />
              <GradientText text="TV" colors={GRADIENTS.tv} style={styles.brandText} />
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Welcome</Text>
            <Text style={styles.subtitle}>Sign in to your account or create a new one</Text>

            <View style={styles.segment}>
              <Pressable
                onPress={() => onToggleMode("signIn")}
                disabled={isBusy}
                style={[styles.segmentItem, mode === "signIn" && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentText, mode === "signIn" && styles.segmentTextActive]}>
                  Sign In
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onToggleMode("signUp")}
                disabled={isBusy}
                style={[styles.segmentItem, mode === "signUp" && styles.segmentItemActive]}
              >
                <Text style={[styles.segmentText, mode === "signUp" && styles.segmentTextActive]}>
                  Sign Up
                </Text>
              </Pressable>
            </View>

            <Text style={styles.label}>
              Email <Text style={styles.required}>*</Text>
            </Text>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="you@example.com"
                  placeholderTextColor={COLORS.muted2}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, errors.email && styles.inputError]}
                  returnKeyType="next"
                />
              )}
            />
            {!!errors.email?.message && <Text style={styles.errorText}>{errors.email.message}</Text>}

            <Text style={[styles.label, { marginTop: 14 }]}>
              Password <Text style={styles.required}>*</Text>
            </Text>
            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.muted2}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, errors.password && styles.inputError]}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                />
              )}
            />
            {!!errors.password?.message && (
              <Text style={styles.errorText}>{errors.password.message}</Text>
            )}

            {!!formError && <Text style={styles.errorText}>{formError}</Text>}

            <Pressable
              onPress={handleSubmit(onSubmit)}
              disabled={isBusy}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.primaryButtonPressed,
                isBusy && styles.primaryButtonDisabled,
              ]}
            >
              {authLoading || isSubmitting ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text style={styles.primaryButtonText}>{submitLabel}</Text>
              )}
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              onPress={onGooglePress}
              disabled={isBusy}
              style={({ pressed }) => [styles.oauthButton, pressed && styles.oauthButtonPressed]}
            >
              {googleLoading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Image source={require("../../assets/google_icon.png")} style={styles.googleIcon} />
              )}
              <Text style={styles.oauthText}>{googleLabel}</Text>
            </Pressable>
          </View>

          <View style={{ height: 28 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const COLORS = {
  bg: "#0B0B10",
  card: "#14141B",
  cardBorder: "rgba(255,255,255,0.08)",
  text: "#F4F5F7",
  muted: "rgba(244,245,247,0.65)",
  muted2: "rgba(244,245,247,0.40)",
  inputBg: "#101017",
  inputBorder: "rgba(255,255,255,0.10)",
  purple: "#7C3AED",
  purplePressed: "#6D28D9",
  danger: "#EF4444",
};

const GRADIENTS: { crea: GradientColors; tv: GradientColors } = {
  crea: ["hsl(265 83% 57%)", "hsl(203 92% 75%)"],
  tv: ["hsl(24 96% 55%)", "hsl(63 100% 73%)"],
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 24,
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  brandRow: {
    width: "100%",
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  brandLogo: {
    width: 44,
    height: 44,
    marginRight: 10,
  },
  brandTextRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandText: {
    fontFamily: "RubikGlitch",
    fontSize: 34,
    letterSpacing: 0.2,
    color: COLORS.text,
  },
  gradientMask: {
    color: "#fff",
  },
  gradientHidden: {
    opacity: 0,
  },
  gradientContainer: {
    alignSelf: "flex-start",
  },
  gradientFallback: {
    color: COLORS.text,
  },

  card: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13.5,
    color: COLORS.muted,
    lineHeight: 18,
  },

  segment: {
    marginTop: 16,
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 12,
    padding: 4,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentItemActive: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  segmentText: {
    color: COLORS.muted2,
    fontWeight: "700",
    fontSize: 14,
  },
  segmentTextActive: {
    color: COLORS.text,
  },

  label: {
    marginTop: 14,
    marginBottom: 8,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
  required: { color: COLORS.muted },

  input: {
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    color: COLORS.text,
    fontSize: 15,
  },
  inputError: {
    borderColor: "rgba(239,68,68,0.7)",
  },
  errorText: {
    marginTop: 6,
    color: "rgba(239,68,68,0.9)",
    fontSize: 12.5,
  },

  primaryButton: {
    marginTop: 18,
    backgroundColor: COLORS.purple,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonPressed: { backgroundColor: COLORS.purplePressed },
  primaryButtonDisabled: { opacity: 0.75 },
  primaryButtonText: {
    color: COLORS.text,
    fontWeight: "900",
    fontSize: 16,
    letterSpacing: 0.2,
  },

  dividerRow: {
    marginTop: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  dividerText: {
    color: COLORS.muted2,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  oauthButton: {
    marginTop: 14,
    backgroundColor: "rgba(0,0,0,0.28)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  oauthButtonPressed: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  googleIcon: {
    width: 18,
    height: 18,
    resizeMode: "contain",
  },
  oauthText: {
    color: COLORS.text,
    fontWeight: "800",
    fontSize: 14.5,
  },
});
