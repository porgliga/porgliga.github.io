function makeDate(date, time){
    if (!date || !time) return null;
    const splitted = date.split(".")
    if (splitted.length !== 3 || time.split(":").length !== 2) return 0;
    const [hours, mins] = time.split(":")
    return new Date(Date.parse(`${splitted[2]}-${splitted[1].padStart(2, "0")}-${splitted[0].padStart(2, "0")}T${hours.padStart(2, "0")}:${mins.padStart(2, "0")}`));
}

const FIREBASE_BASEURL = "https://europe-west4-pristine-sphere-435312-g4.cloudfunctions.net/"
const MATCH_TEMPLATE = `<div data-matchid="{ID}" style="{STYLE}" class="wp-block-group alignfull has-primary-background-color has-background has-global-padding is-layout-constrained wp-container-core-group-is-layout-5 wp-block-group-is-layout-constrained">
            <!--{FIRST}-->
            <!--{PLAYOFF}-->
            <!--{DATE}-->
            <!--{TIME}-->
            <div class="match-div" style="display: flex; align-items: center;">
                <div class="team-wrapper team-left">
                    <img style="flex-basis:0;" src="{LEFT_URL}" alt="{LEFT_NAME}"/>
                    <h3 style="flex-grow:1;flex-basis:0;color: #fff;text-align: center;">{LEFT_NAME}</h3>
                </div>
                <div class="score-wrapper">
                {SCORE}
                </div>
                <div class="team-wrapper team-right">
                    <h3 style="flex-grow: 1;flex-basis:0;color: #fff;text-align: center;">{RIGHT_NAME}</h3>
                    <img style="flex-basis:0;" src="{RIGHT_URL}" alt="{RIGHT_NAME}"/>
                </div>
            </div>
            <div class="match-event-wrapper {IS_EMPTY_EVENTS}">
                <div class="left">
                    {LEFT_EVENTS}
                </div>
                <div class="right">
                    {RIGHT_EVENTS}
                </div>
            </div>
            
         </div>`;

const STYLE = `
<style>

div[data-matchid] {
    text-align:center;
}

#nextmatch {
    margin-top: 30px;
}

.match-event-wrapper {
    display: inline-flex;
    gap: 200px;
}

.match-event-wrapper.empty {
    height: 0;
    margin: 0;
}

.match-event-wrapper .right, .match-event-wrapper .left {
    text-align: left;
    flex-grow: 1;
    flex-basis: 0;
}

.match-event-wrapper p {
    margin:5px;
    font-size:20px;
    color: #fff;
    white-space:nowrap;
}

.match-div {
    gap: 50px;
}
 
.match-div > div {
    display:contents;
}

.match-div img {
    width:0;
    margin:10px;
    flex-grow: 1.5;
    pointer-events: none;
}
@media only screen and (max-width: 910px) {
    .match-div {
        gap: 0;
    }
    
    .match-div h1 {
        margin: 20px; 
    }
}    

@media only screen and (max-width: 790px){
    .match-div h3 {
        font-size: 20px;
    }
    .match-div h1 {
        font-size: 37px;
    }
    .match-div img {
        flex-grow: 1;
    }
}

@media only screen and (max-width: 630px){
    
    .match-div h3 {
        font-size: 15px;
    }
    .match-div h1 {
        font-size: 25px;
    }
}



@media only screen and (max-width:570px){

    .match-event-wrapper {
        gap: 60px;
    }


    .match-div .team-wrapper {
        display: flex;
        margin: 10px;
    }
    
    .match-div .team-wrapper.team-left {
        flex-direction: column;
    }
    
    .match-div .team-wrapper.team-right {
        flex-direction: column-reverse;
    }
    
    .match-div .team-wrapper {
        flex-basis: 0;
        flex-grow: 1;
    }
    
    
    .match-div img {
        width:100%;
        margin:0;
    }
}
</style>
`
const PLAYOFF_GROUPNAMES = {
    "osmifinale": "Osmifinále",
    "ctvrtfinale": "Čtvrtfinále",
    "semifinale": "Semifinále",
    "finale": "Finále"
}

let localMatchesCache = [];
async function loadMatches(includeDateless = false, options) {
    const {filter, prepend, maxLength, returnNext} = options||{};
    return new Promise(async (resolve, _) => {
        let data;
        if (includeDateless && Object.keys(localMatchesCache.length) > 0) {
            data = localMatchesCache;
        } else {
            data = await fetch(FIREBASE_BASEURL + "getMatches").then(r => r.json());
            localMatchesCache = data; // before filter
            if (!includeDateless) {
                data = data.filter(l => !!l.date && !!l.time);
            }
        }

        const next = data.filter(m => !m.score && makeDate(m.date, m.time)?.getTime()||0 > Date.now()).sort((a,b) => makeDate(a.date, a.time).getTime() - makeDate(b.date, b.time).getTime())[0]
        if (returnNext){
            data = [next];
        }
        if (filter) {
            data = data.filter(filter);
        }
        if(maxLength) {
            data = data.slice(0, maxLength)
        }

        const elements = [STYLE, ...data.map(l => {
            const date = l.date || "BEZ DANÉHO DATA";
            const time = l.time || "BEZ DANÉHO ČASU";

            let returnValue = MATCH_TEMPLATE
                .replaceAll("{STYLE}", `padding: 30px var(--wp--preset--spacing--50) 50px;`)
                .replaceAll("{LEFT_URL}", `/images/${formatImageURL(l.team_left)}.png`)
                .replaceAll("{LEFT_NAME}", l.team_left)
                .replaceAll("{RIGHT_URL}", `/images/${formatImageURL(l.team_right)}.png`)
                .replaceAll("{RIGHT_NAME}", l.team_right)
                .replaceAll("{SCORE}", `<h1 ${includeDateless ? "class='settable-score'" : ""} style="color: #fff;white-space:pre;">${l.score || "- : -"}</h1>`)
                .replaceAll("<!--{DATE}-->", `<h3 ${includeDateless ? "class='settable-date'" : ""} style="${includeDateless ? "height:40px" : ""};  color: #fff; text-align: center; font-weight: normal; margin-top: 5px;">${date}</h3>`)
                .replaceAll("<!--{TIME}-->", `<h3 ${includeDateless ? "class='settable-time'" : ""} style="${includeDateless ? "height:40px" : ""}; color: #fff; text-align: center; font-weight: normal; margin-top: 0; margin-bottom: 40px;">${time}</h3>`)
                .replaceAll("<!--{PLAYOFF}-->", l.playoff ? `<h3 style="width:fit-content;color: #fff; text-align: center; font-weight: bold;margin-top:5px;margin-bottom:40px;    border-bottom: 2px solid white;">${PLAYOFF_GROUPNAMES[l.playoff]}</h3>` : "")
                .replaceAll("{LEFT_EVENTS}", l.events?.left?.split("\n").map(e => `<p>${e}</p>`).join("\n") || "<p></p>")
                .replaceAll("{RIGHT_EVENTS}", l.events?.right?.split("\n").map(e => `<p>${e}</p>`).join("\n") || "<p></p>")
                .replaceAll("{IS_EMPTY_EVENTS}", (!l.events || (!l.events.left && !l.events.right)) ? "empty" : "")
                .replaceAll("{ID}", l.id)

            if (l.id === next?.id) {
                returnValue = returnValue
                    .replaceAll("<!--{FIRST}-->", "<h2 id=\"nextmatch\" style=\"color: #fff; text-align: center;margin-bottom: 30px;\">Příští zápas</h2>");
            }

            return returnValue;
        })];

        const container = document.getElementById("matches-container");

        if (elements.length === 0) {
            container.innerHTML = `<h3 style="text-align: center">Ještě nejsou naplánované žádné zápasy.</h3>`;

            if (!includeDateless) {
                container.innerHTML += `<a style="cursor: pointer; border-bottom: 2px solid black;" onclick='loadMatches(true)'>Zobrazit všechny budoucí (BEZ pořadí)</a>`
            }
        } else {
            if (prepend) {
                elements[elements.length - 1] = elements[elements.length - 1]
                    .replace(/padding: .*;/, "padding: 0 var(--wp--preset--spacing--50) 0;")
                container.innerHTML = elements.join("<br/><br/>") + container.innerHTML;
            } else {
                container.innerHTML = elements.join("<br/><br/>");
            }
            // wait for innerHTML to redraw
            setTimeout(() => document.querySelector("#nextmatch")?.parentNode.scrollIntoView({behavior: "smooth"}), 100);
        }
        resolve(data.length ? data[0] : null)
    })
}

function formatImageURL(teamName){
    return teamName.toLowerCase().normalize("NFD").replace(/[\p{Diacritic}|\s]/gu, "");
}
