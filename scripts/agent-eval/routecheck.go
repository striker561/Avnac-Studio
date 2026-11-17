package main

import (
	"fmt"

	"Avnac/internal/skill"
)

func ids(g *skill.Guide) []string {
	var out []string
	for _, r := range g.Rules {
		out = append(out, r.ID)
	}
	return out
}

// Offline route check: same library, no MCP server, so it cannot perturb the
// guide state a test agent will see.
func main() {
	lib, err := skill.Default()
	if err != nil {
		panic(err)
	}
	briefs := []struct{ name, text string }{
		{"print-programme", "Design a one-page A5 concert programme insert for the Night Music chamber series. It will be printed on cream 120gsm and folded once. Include the title NIGHT MUSIC, the ensemble Quartet Aria, Saturday 22 November at 7:30pm, St. Anne's Hall, 14 Chapel Street, and the line Doors 7pm. Latecomers admitted between movements. The director wants a print-ready file for the printer and a small web preview for the listing. The blank A5 project Night Music Programme is open."},
		{"winter-carousel", "Grain and Bean is launching a winter menu. Make a four-slide Instagram carousel, 1080x1350, that introduces three new drinks and ends with the shop details. Slide 1: WINTER MENU / Three new drinks, one warm room. Slide 2: MAPLE OAT LATTE / Maple, toasted oats, espresso. Slide 3: SMOKED HAZELNUT MOCHA / Dark chocolate, hazelnut, a little smoke. Slide 4: HONEY ROSE CORTADO / Honey, rose, espresso, plus Grain and Bean, 8 Mill Lane, open 7-5. The set has to feel like one campaign, not four unrelated posts. The blank project Grain and Bean Winter Carousel is open."},
		{"library-booking-ui", "Design a 1440x1024 UI screen for the Riverside Library study-room booking app. It needs the room name, date, time slots, a Book this room button, and the signed-in user. Many visitors are older or low-vision, so the screen has to work for them without a separate accessible mode. Include an available slot, a selected slot, an unavailable slot, and the disabled state of the button. The blank project Riverside Library Booking is open."},
		{"little-fox-logo", "Little Fox is a new coffee cart. Design a logo that works on a chalkboard, as a 16px favicon, and embroidered on an apron. It should still read when it is one colour and when it is tiny. The blank project Little Fox Mark is open at 1200x1200."},
	}
	for _, brief := range briefs {
		fmt.Printf("\n=== %s ===\n", brief.name)
		for _, rt := range lib.Route(brief.text, 6) {
			fmt.Printf("  %-12s score=%5.2f matched=%v\n", rt.Skill.Name, rt.Score, rt.Matched)
		}
		if g, ok := lib.Guide(brief.text, 6); ok {
			fmt.Printf("  guide: %s conf=%v rules=%v\n", g.Skill.Name, g.Confident(), ids(g))
		}
	}
}
