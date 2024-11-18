import { Controller, Get } from "@overnightjs/core";
import type { Request, Response } from "express";

@Controller("health")
export class Health {
	@Get("")
	public async health(req: Request, res: Response) {
		return res.json({ success: true });
	}
}
