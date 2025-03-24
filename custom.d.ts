import "react";

declare module "react" {
  interface CSSProperties {
    "--buffer-percent"?: string | number;
  }
}
