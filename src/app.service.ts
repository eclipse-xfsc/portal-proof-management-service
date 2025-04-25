import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { Cron, SchedulerRegistry, CronExpression } from '@nestjs/schedule';
import { Console } from 'console';
import { stat } from 'fs';
import { lastValueFrom, map } from 'rxjs';

@Injectable()
export class AppService {

  constructor(private readonly httpService: HttpService) { }

  isAlive(): string {
    return "OK";
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  async checkproofs() {
    const [status, proofs] = await lastValueFrom(this.httpService.get(process.env.SSI_ABSTRACTION + "/proofs")
      .pipe(map(res => [res.status, res.data])));

    if (status != 200)
      return;

    for (let idx in proofs) {
      let proof = proofs[idx]

      var del = false

      if (proof["state"] == "done") {
        let date = new Date(proof["createdAt"])
        date.setMinutes(date.getMinutes() + 10)
        if (date < new Date(Date.now())) {
          del = true
        }
      }

      if (proof["state"] == "request-received") {
        try {
          const [status, proofs] = await lastValueFrom(this.httpService.get(process.env.SSI_ABSTRACTION + "/proofs/" + proof["id"] + "/accept-request")
            .pipe(map(res => [res.status, res.data])));
          console.log(proof)
        }
        catch (e) {
          console.log("Error in accepting the proof" + e)
          del = true
        }
      }
      if (del) {
        console.log("Delete " + proof["id"])
        const [status, proofs] = await lastValueFrom(this.httpService.delete(process.env.SSI_ABSTRACTION + "/proofs/" + proof["id"])
          .pipe(map(res => [res.status, res.data])));
        console.log(status)
      }
    }
  }
}
