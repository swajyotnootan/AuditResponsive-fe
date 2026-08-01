import { STATUS_COLORS } from "./CalendarTheme";
import { CalendarEvent } from "./CalendarTypes";

export function buildMarkedDates(events: CalendarEvent[]) {

    const marked:any={};

    events.forEach(event=>{

        if(!event.start) return;

        if(!marked[event.start]){

            marked[event.start]={

                dots:[]
            };
        }

        const color=
            STATUS_COLORS[event.status as keyof typeof STATUS_COLORS] ??
            STATUS_COLORS.SCHEDULED;

        marked[event.start].dots.push({

            color,

            selectedDotColor:"#fff"
        });

        marked[event.start].selected=true;

        marked[event.start].selectedColor="rgba(37,99,235,.10)";
    });

    return marked;
}