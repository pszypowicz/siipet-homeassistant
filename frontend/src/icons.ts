// Registers the siipet:logo icon in Home Assistant's icon picker, from the
// brand icon of the integration, traced into one path for a 24x24 view box.

const LOGO_PATH =
  "M3.3 21.92C3.18 21.86 3.11 21.79 3.06 21.67C2.98 21.51 2.98 21.46 2.98 17.06C2.98 12.2 2.98 12.23 3.2 11.75C3.38 11.38 5.74 7.98 5.82 7.98C5.96 7.98 5.98 8.06 5.98 8.51C5.98 8.8 6 9 6.04 9.08C6.09 9.22 7.28 10.38 7.46 10.47C7.54 10.52 7.75 10.54 8.21 10.55C8.83 10.57 8.86 10.58 8.87 10.66C8.87 10.71 8.72 11.04 8.51 11.44C7.63 13.11 7.55 13.28 7.55 13.39C7.55 13.47 7.86 13.96 8.76 15.24C9.43 16.2 10.04 17.1 10.11 17.24C10.18 17.39 10.29 17.66 10.35 17.85L10.45 18.19L10.47 19.89C10.48 21.53 10.48 21.59 10.4 21.71C10.36 21.78 10.28 21.87 10.22 21.91C10.12 21.98 9.91 21.98 6.79 21.99C3.49 22 3.46 22 3.3 21.92ZM12.35 21.93C12.28 21.89 12.18 21.81 12.14 21.75C12.06 21.64 12.06 21.62 12.04 17.01L12.02 12.37L11.93 12.1C11.88 11.95 11.78 11.73 11.72 11.61C11.6 11.4 8.55 7.28 8.47 7.23C8.36 7.15 8.39 7.3 8.64 8.03C8.79 8.46 8.91 8.84 8.9 8.86C8.89 8.89 8.84 8.94 8.79 8.97C8.71 9.02 8.65 9.02 8.18 8.91C7.89 8.85 7.63 8.78 7.6 8.75C7.56 8.72 7.55 8.49 7.55 7.55C7.55 6.82 7.56 6.34 7.59 6.27C7.61 6.19 7.92 5.87 8.42 5.39C8.85 4.98 9.64 4.22 10.16 3.72C10.69 3.22 11.3 2.63 11.52 2.42C11.81 2.14 11.95 2.04 12.05 2.02C12.16 2 12.48 2.09 13.79 2.53C14.67 2.82 15.42 3.09 15.46 3.12C15.53 3.19 15.53 3.36 15.45 3.81C15.34 4.49 15.29 4.48 14.21 3.68C13.74 3.33 13.35 3.06 13.34 3.07C13.33 3.08 13.41 3.16 13.51 3.25C13.62 3.34 15.2 4.91 17.03 6.73C20.65 10.34 20.6 10.29 20.83 10.96C20.89 11.13 20.96 11.43 20.98 11.61C21.01 11.82 21.02 13.62 21.02 16.72C21.02 21.47 21.02 21.51 20.94 21.67C20.88 21.79 20.82 21.86 20.7 21.92C20.53 22 20.49 22 16.51 22C12.76 22 12.48 22 12.35 21.93Z";

export interface CustomIcon {
  path: string;
}

interface CustomIconListItem {
  name: string;
  keywords?: string[];
}

interface CustomIconHelpers {
  getIcon(name: string): Promise<CustomIcon>;
  getIconList?(): Promise<CustomIconListItem[]>;
}

interface CustomIconsWindow {
  customIcons?: Record<string, CustomIconHelpers>;
}

const win = window as unknown as CustomIconsWindow;
if (!win.customIcons) {
  win.customIcons = {};
}

win.customIcons.siipet = {
  async getIcon(name: string): Promise<CustomIcon> {
    return { path: name === "logo" ? LOGO_PATH : "" };
  },
  async getIconList(): Promise<CustomIconListItem[]> {
    return [{ name: "logo", keywords: ["siipet", "litter", "cat"] }];
  },
};
