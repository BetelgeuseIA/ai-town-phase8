import * as PIXI from 'pixi.js';

export class GameEngine {
  private app: PIXI.Application | null = null;
  private agents: PIXI.Graphics[] = [];
  private movingAgent: PIXI.Graphics | null = null;
  private moveDirection: number = 1; // 1 for right, -1 for left
  private currentPosition: { x: number; y: number } = { x: 100, y: 300 };

  constructor() {}

  async initialize(canvas: HTMLCanvasElement) {
    this.app = new PIXI.Application({
      view: canvas,
      width: 800,
      height: 600,
      backgroundColor: 0x1a4d2e, // Dark green terrain
      antialias: true,
    });

    this.createAgents();
    this.setupAnimation();
  }

  private createAgents() {
    if (!this.app) return;

    // Create 3 simple colored circles as agents
    const colors = [0xff0000, 0x00ff00, 0x0000ff]; // Red, Green, Blue
    const positions = [
      { x: 100, y: 300 }, // Moving agent starts here
      { x: 400, y: 200 },
      { x: 600, y: 400 },
    ];

    for (let i = 0; i < 3; i++) {
      const agent = new PIXI.Graphics();
      agent.beginFill(colors[i]);
      agent.drawCircle(0, 0, 15); // Circle with radius 15
      agent.endFill();
      agent.x = positions[i].x;
      agent.y = positions[i].y;
      
      this.app.stage.addChild(agent);
      this.agents.push(agent);

      // Mark the first agent as the moving one
      if (i === 0) {
        this.movingAgent = agent;
      }
    }
  }

  private setupAnimation() {
    if (!this.app) return;

    // Animation loop for moving agent
    this.app.ticker.add(() => {
      if (this.movingAgent) {
        // Move between point A (100,300) and point B (700,300)
        if (this.moveDirection === 1) {
          // Moving right
          this.currentPosition.x += 1;
          if (this.currentPosition.x >= 700) {
            this.moveDirection = -1;
          }
        } else {
          // Moving left
          this.currentPosition.x -= 1;
          if (this.currentPosition.x <= 100) {
            this.moveDirection = 1;
          }
        }

        this.movingAgent.x = this.currentPosition.x;
        this.movingAgent.y = this.currentPosition.y;
      }
    });
  }

  destroy() {
    if (this.app) {
      this.app.destroy(true);
      this.app = null;
    }
  }
}