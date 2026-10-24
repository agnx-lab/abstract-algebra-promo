// 场景：抽象代数宣传片 host 单例绑定。
import type { WorkspaceAppHostApi } from "@agnx-lab/app-sdk";

let boundHost: WorkspaceAppHostApi | null = null;

export function bindAbstractAlgebraPromoHost(host: WorkspaceAppHostApi): void {
  boundHost = host;
}

export function requireBoundHost(): WorkspaceAppHostApi {
  if (!boundHost) {
    throw new Error("抽象代数宣传片 host 未绑定");
  }
  return boundHost;
}
