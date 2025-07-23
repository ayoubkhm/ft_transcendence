
import { Paddle } from '../types.js';

export class PIDController {
  private kp: number; // Proportional gain
  private ki: number; // Integral gain
  private kd: number; // Derivative gain

  private previousError: number = 0;
  private integral: number = 0;

  constructor(kp: number, ki: number, kd: number) {
    this.kp = kp;
    this.ki = ki;
    this.kd = kd;
  }

  update(paddle: Paddle, targetY: number, dt: number): number {
    const error = targetY - (paddle.y + paddle.h / 2);

    this.integral += error * dt;
    const derivative = (error - this.previousError) / dt;

    const output = this.kp * error + this.ki * this.integral + this.kd * derivative;

    this.previousError = error;

	console.log(`PID LOG: Error: ${error.toFixed(2)}, Integral: ${this.integral.toFixed(2)}, Derivative: ${derivative.toFixed(2)}, Output: ${output.toFixed(2)}`);

    return output;
  }

  reset() {
    this.previousError = 0;
    this.integral = 0;
  }
}


export class RateLimiter {
  private lastExecutionTime: number = 0;
  private interval: number;

  constructor(interval: number) {
    this.interval = interval;
  }

  shouldExecute(): boolean {
    const now = Date.now();
    if (now - this.lastExecutionTime >= this.interval) {
      this.lastExecutionTime = now;
      return true;
    }
    return false;
  }
}
