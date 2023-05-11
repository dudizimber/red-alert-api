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

/**
 * @example {
    alertDate: '2023-05-02 06:36:50',
    title: 'ירי רקטות וטילים',
    data: 'סעד'
  }
 */
export interface AlertHistoryAPI {
  alertDate: string;
  title: string;
  data: string;
}

export interface AlertHistoryData {
  alertDate: string;
  title: string;
  data: Target | { name: string };
}

/**
 * @example {
    "id": "133275210190000000",
    "cat": "1",
    "title": "ירי רקטות וטילים",
    "data": [
      "כיסופים"
    ],
    "desc": "היכנסו למרחב המוגן ושהו בו 10 דקות"
}
 */
export interface AlertData {
  id: string;
  cat: string;
  title: string;
  data: string[];
  desc: string;
}

export interface AlertTarget {
  target: Target;
  category: "missile" | "infiltration" | string;
  id: string;
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

  private async _getRedAlertsHistory(): Promise<AlertHistoryAPI[]> {
    try {
      const HOST =
        "https://www.oref.org.il/WarningMessages/History/AlertsHistory.json";
      const response = await axios.get(HOST, { headers: this.headers });

      if (response.status !== 200) {
        console.error("Failed to get red alerts");
        return [];
      }

      if (typeof response.data === "object") {
        return response.data;
      }

      return [];
    } catch (error) {
      console.error(error);
      return [];
    }
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
        ? response.data
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
      const target = targets.find((target) => target.name === alert) as Target;
      if (!target) {
        console.error(`Unknown target: ${alert}`);
        return;
      }
      alerts.push({
        target,
        category: this._translateCategory(alertsData.cat, alertsData.title),
        id: alertsData.id,
      });
    });

    return alerts;
  }

  public async getToday(): Promise<AlertHistoryData[]> {
    const alertsData = await this._getRedAlertsHistory();

    if (!alertsData) return [];

    const alerts: AlertHistoryData[] = [];
    alertsData.forEach((alert) => {
      const alertTargets = alert.data.split(",").map((target) => target.trim());
      alertTargets.forEach((target) => {
        alerts.push({
          alertDate: alert.alertDate,
          title: alert.title,
          data: targets.find((t) => t.name === target) ??
            targets.find((t) => t.name.includes(target)) ?? { name: target },
        });
      });
    });

    return alerts;
  }

  private _translateCategory(cat: string, descr?: string) {
    switch (cat) {
      case "1":
        return "missile";
      case "2":
        return "infiltration";
      default:
        return descr || "unknown";
    }
  }
}
