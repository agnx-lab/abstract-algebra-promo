// 场景：抽象代数宣传片 Sub App 入口 — activate。
import type { WorkspaceAppHostApi, WorkspaceAppModule } from "@agnx-lab/app-sdk";
import { activate as activatePanel } from "./panel";
import { bindAbstractAlgebraPromoHost } from "./host-bind";
import { AAP_APP_ID } from "./constants";

export const appId = AAP_APP_ID;

export function activate(host: WorkspaceAppHostApi): () => void {
  bindAbstractAlgebraPromoHost(host);
  return activatePanel(host);
}

const moduleExport: WorkspaceAppModule = {
  appId: AAP_APP_ID,
  activate,
};

export default moduleExport;

export {
  AAP_APP_ID,
  AAP_OPEN_COMMAND_ID,
  AAP_PANEL_ID,
} from "./constants";
