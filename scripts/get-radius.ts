import targets from "../src/assets/targets.json";
import * as xml2js from "xml2js";
import { groupBy, values } from "lodash";
import { writeFileSync, openSync, closeSync, readFileSync } from "fs";

const URL = (lat: number, lng: number, radius: number) =>
  `https://www.freemaptools.com/ajax/get-all-cities-inside.php?lat=${lat}&lng=${lng}&sortaplha=0&radius=${radius}&population=-1`;

async function getCitiesInside(lat: number, lng: number, radius: number) {
  console.log("fetching cities", { lat, lng, radius });

  const response = await fetch(URL(lat, lng, radius), {
    headers: {
      // 'Cookie': 'PHPSESSID=91b32d787caa915abc2077013d4f106c; _ga_4HJBJJBR6Z=GS1.1.1681720067.1.0.1681720067.0.0.0; _ga=GA1.1.2075694667.1681720067; __cf_bm=PxHpztLYB1cW1WjdGrBVhsUveyLMd3NEi5w8DpphvNs-1681720067-0-ATTpjwGPwZL9PT+Uq8sDVXhM5w5BF7S8ToF6NOsJBFkiULjNfuPpkOpCivHzGGAkzxrWwZsKP+Tv8pPRQkkfsBNqjphheSQBwmJucjuO4mqH/KMMEwt+aRDEzfOwIzQdfw==; FCNEC=%5B%5B%22AKsRol9mAsbMdGQR7QMAoTcv5C21KdxEo2RTXCTtYTqRDA7l_hnxHHI64aO8mqHVWw0tMF_O9_t3lSFCIO3SsBjbz2zhBgLpyrDIi7recB4p9vjSgf7RZM2p6pUy6TnydNVQ0ydIi7HHZhZ6OpkUtX9k8H2uVBgLMQ%3D%3D%22%5D%2Cnull%2C%5B%5D%5D',
      Referer:
        "https://www.freemaptools.com/ajax/get-all-cities-inside.php?lat=32.95803&lng=35.171969&sortaplha=0&radius=1&population=-1",
    },
  });
  const xml = await response.text();

  const json = await parse(xml);

  const groups = groupBy(
    (json["cities"]?.["city"] ?? []).map((city: any) => city["$"]),
    (city: any) => `${city.lat},${city.lng}`
  );

  const cities = values(groups ?? {}).map((group) => group[0]) ?? [];
  return cities;
}

function parse(data: string) {
  return new Promise<string>((resolve, reject) => {
    xml2js.parseString(data, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function calculateRadiusForTarget(
  target: any,
  prevRadius = 41,
  prevCities: any[] = [],
  radiuses: number[] = [],
  i = 0
) {
  console.log("calculateRadiusForTarget", {
    name: target.name,
    prevRadius,
    prevCities: prevCities.length,
  });

  const { lat, lng } = target;
  const { radius: newRadius, dir } = calculateNewRadius(
    prevRadius,
    prevCities,
    i
  );
  if (newRadius === 1) return newRadius;
  if (radiuses.includes(newRadius)) return prevRadius;
  radiuses.push(newRadius);
  console.log("newRadius", { newRadius });
  const cities = await getCitiesInside(lat, lng, newRadius);
  console.log("cities", cities.length);
  if (cities.length === 0)
    return calculateRadiusForTarget(target, newRadius, cities, radiuses, i + 1);
  if (cities.length === 1 || dir === "up") return newRadius;
  return calculateRadiusForTarget(target, newRadius, cities, radiuses, i + 1);
}

function calculateNewRadius(prevRadius: number, prevCities: any[], i: number) {
  if (!prevCities.length && i > 0) return { radius: prevRadius + 1, dir: "up" };
  const ceil = Math.ceil(prevRadius / 2);
  if (ceil <= 1) return { radius: 1, dir: "down" };
  return { radius: ceil, dir: "down" };
}

async function main() {
  const mappedTargets = readFileSync("./src/assets/targets-radius.txt");
  const file = openSync("./src/assets/targets-radius-1.txt", "w");
  const t = [...targets];
  try {
    for await (const target of t) {
        if (mappedTargets.includes(target.name)) continue;
      const radius = await calculateRadiusForTarget(target);
      console.log("radius for", target.name, radius);
      (target as any).radius = radius;
      writeFileSync(file, `${target.name} ${radius} \n`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    closeSync(file);
    writeFileSync(
      "./src/assets/targets-radius.json",
      JSON.stringify(t, null, 2)
    );
  }
}

main();
