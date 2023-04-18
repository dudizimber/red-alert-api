import axios from "axios";
import targets from "./assets/targets.json";

export interface Target {
  name: string;
  name_en: string;
  zone: string;
  zone_en: string;
  time: string;
  time_en: string;
  countdown: number;
  lat: number;
  lng: number;
  value: string;
  radius: number;
}

export interface AlertData {
  cities_labels: Array<any>;
  data: Array<any>;
  id: number;
  timestamp: number;
  time_to_run: number;
  category: number;
  category_desc: string;
}

export interface AlertTarget {
  target: Target;
  category: "missile" | "infiltration" | string;
  date: Date;
  id: number;
}

export class RedAlert {
  cookies: any;
  headers: any;

  private constructor() {
    // initialize user agent for web requests
    this.headers = {
      Host: "www.oref.org.il",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      charset: "utf-8",
      "X-Requested-With": "XMLHttpRequest",
      "sec-ch-ua-mobile": "?0",
      "User-Agent": "",
      "sec-ch-ua-platform": "macOS",
      Accept: "*/*",
      "sec-ch-ua":
        '".Not/A)Brand"v="99", "Google Chrome";v="103", "Chromium";v="103"',
      "Sec-Fetch-Site": "same-origin",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Dest": "empty",
      Referer: "https://www.oref.org.il/12481-he/Pakar.aspx",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
    };
  }

  public static async init() {
    const redAlert = new RedAlert();
    await redAlert._getCookies();
    return redAlert;
  }

  private async _getCookies() {
    const HOST = "https://www.oref.org.il/";
    return axios
      .get(HOST, { headers: this.headers })
      .then((response) => {
        this.cookies = response.headers["set-cookie"];
      })
      .catch((error) => {
        console.error(error);
      });
  }

  private async _getRedAlerts(): Promise<AlertData | null> {
    try {
      const HOST = "https://www.oref.org.il/WarningMessages/alert/alerts.json";
      const response = await axios.get(HOST, { headers: this.headers });

      if (response.status !== 200) {
        console.error("Failed to get red alerts");
        return null;
      }

      return typeof response.data !== "string" &&
        JSON.stringify(response.data).length > 6
        ? JSON.parse(response.data)
        : JSON.stringify(response.data).length <= 6
        ? null
        : response.data;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  public async read(): Promise<AlertTarget[]> {
    const alertsData = await this._getRedAlerts();

    if (!alertsData) return [];

    const alerts: AlertTarget[] = [];
    alertsData.data.forEach((alert: any) => {
      alerts.push({
        target: targets.find((target) => target.name === alert) as Target,
        category: this._translateCategory(
          alertsData.category,
          alertsData.category_desc
        ),
        date: new Date(alertsData.timestamp),
        id: alertsData.id,
      });
    });

    return alerts;
  }

  private _translateCategory(cat: number, descr?: string) {
    switch (cat) {
      case 1:
        return "missile";
      case 2:
        return "infiltration";
      default:
        return descr || "unknown";
    }
  }
}
