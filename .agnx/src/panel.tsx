// 场景：抽象代数宣传片薄壳面板 — host.guest.mount；首帧品牌扫光。
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ComponentType,
  type ReactElement,
} from "react";
import { Text, View } from "react-native";
import { StyleSheet } from "react-native-unistyles";
import type {
  WorkspaceAppBrandLogoLoaderPanelProps,
  WorkspaceAppHostApi,
} from "@agnx-lab/app-sdk";
import {
  AAP_APP_ID,
  AAP_DEFAULT_PORT,
  AAP_ENSURE_TOOL_REL,
  AAP_OPEN_COMMAND_ID,
  AAP_PANEL_ID,
} from "./constants";
import { bindAbstractAlgebraPromoHost, requireBoundHost } from "./host-bind";

const WEB_ROOT_STYLE: CSSProperties = {
  flex: "1 1 0%",
  alignSelf: "stretch",
  minHeight: 0,
  minWidth: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  backgroundColor: "transparent",
};

const GUEST_HOST_STYLE: CSSProperties = {
  flex: "1 1 auto",
  minHeight: 0,
  minWidth: 0,
  width: "100%",
  height: "100%",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  position: "relative",
};

const BOOT_LAYER_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 2,
  display: "flex",
  flexDirection: "column",
  background: "rgb(9, 9, 11)",
};

const ERROR_LAYER_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 3,
  display: "flex",
  flexDirection: "column",
  background: "rgba(9,9,11,0.88)",
};

const ERROR_FALLBACK_STYLE: CSSProperties = {
  ...ERROR_LAYER_STYLE,
  alignItems: "center",
  justifyContent: "center",
  color: "#a1a1aa",
  padding: 24,
  textAlign: "center",
};

const styles = StyleSheet.create((theme) => ({
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing[6],
    backgroundColor: "transparent",
  },
  fallbackText: {
    color: theme.colors.foregroundMuted,
    fontSize: theme.fontSize.sm,
    textAlign: "center",
  },
}));

function getHost(): WorkspaceAppHostApi {
  return requireBoundHost();
}

function canUseGuestSurface(): boolean {
  return typeof document !== "undefined" && getHost().platform.isWeb;
}

export function AbstractAlgebraPromoPanel(_props: {
  appId: string;
  panelId: string;
  entityId: string;
}): ReactElement {
  const guestHostRef = useRef<HTMLDivElement | null>(null);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canUseGuestSurface()) {
      setBooting(false);
      setError("抽象代数宣传片仅支持桌面 / 网页壳");
      return;
    }

    const host = getHost();
    const container = guestHostRef.current;
    if (!container) {
      return;
    }
    if (!host.guest?.mount) {
      setBooting(false);
      setError("宿主未提供 host.guest.mount（需升级 Agnx）");
      return;
    }

    const unmount = host.guest.mount({
      container,
      ensureTool: AAP_ENSURE_TOOL_REL,
      ensureArgs: ["--port", String(AAP_DEFAULT_PORT)],
      timeoutMs: 120_000,
      bootOverlay: false,
      bootTitle: "正在启动抽象代数宣传片…",
      onReady: () => {
        setError(null);
        window.setTimeout(() => setBooting(false), 320);
      },
      onError: (detail) => {
        setBooting(false);
        setError(`${detail.code}: ${detail.message}`);
      },
    });

    return unmount;
  }, []);

  if (!canUseGuestSurface()) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>{error ?? "抽象代数宣传片仅支持桌面 / 网页壳"}</Text>
      </View>
    );
  }

  const BrandPanel = getHost().ui?.BrandLogoLoaderPanel as
    | ComponentType<WorkspaceAppBrandLogoLoaderPanelProps>
    | undefined;

  return (
    <div
      style={WEB_ROOT_STYLE}
      data-testid="workspace-mini-app-abstract-algebra-promo-root"
      aria-label="抽象代数 panel"
    >
      <div
        ref={guestHostRef}
        data-agnx-guest-surface-host="true"
        style={GUEST_HOST_STYLE}
      />
      {booting && !error && BrandPanel ? (
        <div data-agnx-guest-boot-overlay="true" style={BOOT_LAYER_STYLE} role="status">
          <BrandPanel title="正在启动抽象代数宣传片…" testID="aap-boot-overlay" />
        </div>
      ) : null}
      {booting && !error && !BrandPanel ? (
        <div data-agnx-guest-boot-overlay="true" style={ERROR_FALLBACK_STYLE} role="status">
          正在启动抽象代数宣传片…
        </div>
      ) : null}
      {error && BrandPanel ? (
        <div style={ERROR_LAYER_STYLE} role="alert">
          <BrandPanel title={error} testID="aap-mount-error" />
        </div>
      ) : null}
      {error && !BrandPanel ? (
        <div style={ERROR_FALLBACK_STYLE} role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
}

export function activate(host: WorkspaceAppHostApi): () => void {
  bindAbstractAlgebraPromoHost(host);
  const disposers: Array<() => void> = [];

  disposers.push(
    host.registerMiniApp({
      id: AAP_PANEL_ID,
      appId: AAP_APP_ID,
      title: "抽象代数",
      component: AbstractAlgebraPromoPanel,
      iframeShortcutCapture: true,
      isolation: {
        mode: "iframe",
        sidecarTools: [AAP_ENSURE_TOOL_REL],
        note: "Tab iframe 加载本仓 promo.html 静态站；ensure 起 promo-static-server",
      },
    }),
  );

  disposers.push(
    host.registerCommand({
      id: AAP_OPEN_COMMAND_ID,
      appId: AAP_APP_ID,
      title: "抽象代数宣传片",
      keywords: ["abstract", "algebra", "抽象代数", "宣传片", "结构之美"],
      run: (context) => {
        host.openSubAppTab({
          appId: AAP_APP_ID,
          panelId: AAP_PANEL_ID,
          serverId: context?.serverId,
          workspaceId: context?.workspaceId,
          currentPathname: context?.currentPathname,
        });
      },
    }),
  );

  return () => {
    for (const d of disposers.toReversed()) {
      d();
    }
  };
}
