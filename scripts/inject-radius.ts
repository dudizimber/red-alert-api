import { readFileSync, writeFileSync } from 'fs'

export async function main() {

    const txtFile = readFileSync("./src/assets/targets-radius.txt").toString('utf8');
    const jsonFile = readFileSync("./src/assets/targets-radius.json").toString('utf8');

    const targets = txtFile.split("\n").map((t) => {
        console.log(JSON.stringify(t));
        
        const name = t.replace(/\d+/, '').trim();
        const radius = t.replace(name, '').trim();
        console.log(name);
        console.log(radius);
        
        return { name, radius };
    });
    
    const targetsJson = JSON.parse(jsonFile);

    for (const target of targetsJson) {
        
        const targetTxt = targets.find(t => t.name.includes(target.name));
        if (!targetTxt) {
            // console.log('could not find', target.name);
            continue;
        }
        console.log('found', target.name, targetTxt);
        
        target.radius = parseInt(targetTxt.radius) + 1;
    }

    writeFileSync("./src/assets/targets-radius-out.json", JSON.stringify(targetsJson, null, 2));

}


main();