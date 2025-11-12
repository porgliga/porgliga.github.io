const TEAM_TEMPLATE =
    `<tr>
<td class="{COLOR}" style="font-weight: bold">{POS}</td>
<td class="{COLOR}">{TEAM}</td>
<td class="hide">{COUNT}</td>
<td>{WON}</td>
<td>{LOST}</td>
<td class="hide">{DRAWN}</td>
<td class="hide">{GOALS}</td>
<td class="points" style="font-weight: bold">{POINTS}</td>
</tr>`;

const SHOOTER_TEMPLATE = `
<tr>
<td style="font-weight: bold">{POS}</td>
<td>{SHOOTER}</td>
<td>{GOALS}</td>
<td>{ASSISTS}</td>
</tr>`

const PLAYOFF_SPAN = `<img onerror="this.parentNode.removeChild(this)" src="{IMG_SRC}" alt=""/>{TEAM_NAME}`

const GREEN_MAX = 4
const YELLOW_MAX = 12

function reverseChildren(parent){
    for (let i = 1; i < parent.childNodes.length; i++){
        parent.insertBefore(parent.childNodes[i], parent.firstChild);
    }
}

let teams = {};
async function loadTeams() {
    teams = await fetch(FIREBASE_BASEURL + "getTeams").then(r => r.json());
    sort("teams", (a,b) => (b.points - a.points) || ((b.goalsGiven-b.goalsReceived) - (a.goalsGiven-a.goalsReceived)))
}

let matches = {};
let shooters = {}
async function loadShooters() {
    matches = await fetch(FIREBASE_BASEURL + "getMatches").then(r => r.json());

    for (const match of Object.values(matches)){
        if (!match.events) continue;
        for (const event of [...match.events.left?.split("\n")||[], ...match.events.right?.split("\n")||[]]){
            if (event.length < 1) continue;
            if (!event.includes("⚽")) continue;
            const splitted = event.split("(").map(e => e.replaceAll("⚽", "").trim())
			let goalInc = 1;
			if (new RegExp(/^\d\d?x /).test(splitted[0])) {
				goalInc = parseInt(splitted[0].split("x")[0].trim());
				splitted[0] = splitted[0].split("x").slice(1).map(e => e.trim()).join("x")
			}

            shooters[splitted[0]] ??= {name: splitted[0], goals: 0, assists: 0/*, team: match.events.left.includes(event) ? match.team_left : match.team_right*/}
            shooters[splitted[0]].goals += goalInc;

            if (splitted.length > 1) {
                const assistName = splitted[1].slice(0,-1);
                shooters[assistName] ??= {name: assistName, goals: 0, assists: 0}
                shooters[assistName].assists++
            }
        }
    }

    sort("shooters", (a,b) => (b.goals - a.goals) || (b.assists - a.assists), true);
}

// playoff = "quarterleft"|"quarterright"|"semileft"|"semiright"|"finals"
async function loadPlayoffTable(){
    const poffMatches = Object.values(matches).filter(m => m.playoff && m.playoffIdx);
    for (const match of poffMatches){
        const matchupEl = document.querySelector(`section.round.${match.playoff} .matchup:nth-child(${match.playoffIdx})`)
        matchupEl.classList.add("filled");
        const spanEls = matchupEl.querySelectorAll(".participant");
        if (spanEls.length < 2) {
            document.querySelector(".playoff").remove();
            throw Error("Not enough playoff teams - database error...");
        }

        spanEls.forEach(el => el.addEventListener("click", (_) => {
            loadMatches(true, {filter: m => m.playoff === match.playoff && m.playoffIdx === match.playoffIdx, maxLength: 2})
        }));

        spanEls[0].innerHTML = `<span>${PLAYOFF_SPAN.replace("{IMG_SRC}", makeImageURL(match.team_left)).replace("{TEAM_NAME}", match.team_left)}</span>`
        spanEls[1].innerHTML = `<span>${PLAYOFF_SPAN.replace("{IMG_SRC}", makeImageURL(match.team_right)).replace("{TEAM_NAME}", match.team_right)}</span>`

        const scoreList = match.score?.split(":").map(s => Number(s));
        if (scoreList && scoreList.every(e => !isNaN(e))) {
            spanEls[scoreList[0] > scoreList[1] ? 0 : 1].classList.add("winner")
        }
    }
}

// whichTable = "shooters"  || "teams"
function sort(whichTable, sortFunction, calculatePositions = false){
    const selector = `#table-container .table.${whichTable} .body`;
    let elements;

    switch (whichTable){
        case "shooters":
            let toBeMapped = Object.values(shooters).sort(sortFunction)
            if (!calculatePositions) toBeMapped = toBeMapped.slice(0,30)
            elements = toBeMapped.map((plr, idx) => {

                if (!plr.position) {
                    plr.position = idx+1;
                    shooters[plr.name].position = plr.position;
                }
                return SHOOTER_TEMPLATE
                    .replaceAll("{POS}", String(plr.position))
                    .replaceAll("{SHOOTER}", plr.name)
                    .replaceAll("{GOALS}", plr.goals)
                    .replaceAll("{ASSISTS}", plr.assists)
            })
            break;
        case "teams":
            elements = Object.values(teams).sort(sortFunction).map((team, idx)=> {
                if (!team.position) {
                    team.position = idx + 1;
                    teams[team.name].position = team.position;
                }
                if (!team.color) {
                    team.color = (idx+1) <= GREEN_MAX ? "green" : (idx+1) <= YELLOW_MAX ? "yellow" : "red"
                    teams[team.name].color = team.color;
                }

                return TEAM_TEMPLATE
                    .replaceAll("{POS}", String(team.position))
                    .replaceAll("{COLOR}", String(team.color))
                    .replaceAll("{TEAM}", team.name)
                    .replaceAll("{COUNT}", team.playedCount)
                    .replaceAll("{WON}", team.winCount)
                    .replaceAll("{LOST}", team.loseCount)
                    .replaceAll("{DRAWN}", team.drawCount)
                    .replaceAll("{GOALS}", `${team.goalsGiven}:${team.goalsReceived}`)
                    .replaceAll("{POINTS}", team.points);
            });
            break;
        default:
            throw Error("Invalid sorting call.")
    }
    const container = document.querySelector(selector);

    if (elements.length === 0) {
        container.innerHTML = `<h3 style="text-align: center">Ještě nejsou odehrané žádné zápasy.</h3>`;
    } else {
        container.innerHTML = elements.join("\n");
    }


}

loadTeams().then(() => console.log("teams loaded"))
loadShooters().then(() => {
    console.log("shooters loaded")
    loadPlayoffTable().then(() => console.log("playoff loaded"))
})

document.querySelectorAll(`#table-container .table th[data-property]`).forEach(el => el.addEventListener("click", _ => {
    const table = el.closest("table");
    // DEFAULT ASCENDING
    const sortByProperty = (a,b) => (a[el.dataset.property] - b[el.dataset.property]) || (a.position - b.position)

    const tableType = table.className.includes("teams") ? "teams" : "shooters";
    if (el.dataset.property){
        let sortDirection;
        switch (el.innerText.slice(0,2)){
            case "▼ ":
                el.innerText = "▲ " + el.innerText.slice(2)
                sortDirection = "asc";
                break;
            case "▲ ":
                el.innerText = "▼ " + el.innerText.slice(2);
                sortDirection = "dsc"
                break;
            default:
                el.innerText = "▲  " + el.innerText.slice();
                sortDirection = "asc"
                break;
        }

        const previouslySorted = table.querySelector("th.sorted")
        if (previouslySorted && previouslySorted !== el) {
            previouslySorted.classList.remove("sorted");
            previouslySorted.innerText = previouslySorted.innerText.slice(2);
        }
        if (!el.classList.contains("sorted")) el.classList.add("sorted")

        sort(tableType, (a,b) => sortDirection === "asc" ? sortByProperty(a,b) : sortByProperty(b,a))
    }
}));



//direction -1 | +1
function scrollPlayoff(direction){
    const sections = [...document.querySelectorAll(".playoff section")];
    const showing = sections.filter(s => s.classList.contains("showme"));
    let currentPage = sections.indexOf(showing[0]);
    if ((currentPage === 0 && direction === -1) || (currentPage+direction > sections.length-1  && direction === 1)) return;

    sections[currentPage].classList.remove("showme");
    sections[currentPage + direction].classList.add("showme");
}

document.querySelectorAll(".playoff h1.scroller").forEach(el => el.addEventListener("click", e => {
    scrollPlayoff(e.target.classList.contains("next") ? 1 : -1);
}));

function makeImageURL(teamName){
    return `/images/${teamName.toLowerCase().normalize("NFD").replace(/[\p{Diacritic}|\s]/gu, "")}.png`;
}
