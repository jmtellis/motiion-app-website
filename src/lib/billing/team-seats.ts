export const SEAT_MONTHLY_LOOKUP = "motiion_team_seat_monthly_v1";
export const SEAT_PASS_LOOKUP = "motiion_team_seat_pass_v1";
export const SEAT_MONTHLY_ENV = "STRIPE_TEAM_SEAT_MONTHLY_PRICE_ID";
export const SEAT_PASS_ENV = "STRIPE_TEAM_SEAT_PASS_PRICE_ID";
export function validSeatQuantity(value: number) { return Number.isInteger(value) && value >= 1 && value <= 100; }
export function seatPriceMatches(price: {unit_amount:number|null;currency:string;type:string;recurring?:{interval:string;interval_count:number}|null}, pass:boolean) {
 return price.currency === "usd" && price.unit_amount === (pass?3900:1500) && (pass ? price.type === "one_time" : price.type === "recurring" && price.recurring?.interval === "month" && price.recurring.interval_count === 1);
}

export function isSeatPrice(price:{id:string;lookup_key?:string|null},pass:boolean) { return price.id===process.env[pass?SEAT_PASS_ENV:SEAT_MONTHLY_ENV] || price.lookup_key===(pass?SEAT_PASS_LOOKUP:SEAT_MONTHLY_LOOKUP); }
