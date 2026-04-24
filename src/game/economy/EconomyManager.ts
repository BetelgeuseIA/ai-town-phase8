/**
 * Economy Manager - Sistema económico con supply/demand
 * Gestiona recursos, precios, inflación y transacciones
 */

export enum ResourceType {
  WOOD = 'wood',
  STONE = 'stone',
  IRON = 'iron',
  GOLD = 'gold',
  FOOD = 'food',
  WATER = 'water',
  CLOTH = 'cloth',
  TOOLS = 'tools',
  WEAPONS = 'weapons',
  GEMS = 'gems'
}

export interface PriceInfo {
  basePrice: number;
  currentPrice: number;
  supply: number;
  demand: number;
  trend: 'rising' | 'falling' | 'stable';
}

export interface Transaction {
  id: string;
  timestamp: number;
  type: 'buy' | 'sell';
  resource: ResourceType;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  location: string;
}

export class EconomyManager {
  private prices: Map<ResourceType, PriceInfo>;
  private transactions: Transaction[] = [];
  private inflationRate: number = 0.02; // 2% annual
  private globalSupplyModifier: number = 1.0;
  private globalDemandModifier: number = 1.0;

  constructor() {
    this.prices = new Map();
    this.initializePrices();
  }

  private initializePrices() {
    const basePrices = {
      [ResourceType.WOOD]: { base: 10, supply: 1000, demand: 800 },
      [ResourceType.STONE]: { base: 15, supply: 800, demand: 600 },
      [ResourceType.IRON]: { base: 50, supply: 200, demand: 300 },
      [ResourceType.GOLD]: { base: 500, supply: 20, demand: 100 },
      [ResourceType.FOOD]: { base: 5, supply: 2000, demand: 2500 },
      [ResourceType.WATER]: { base: 2, supply: 5000, demand: 4000 },
      [ResourceType.CLOTH]: { base: 25, supply: 500, demand: 400 },
      [ResourceType.TOOLS]: { base: 75, supply: 150, demand: 200 },
      [ResourceType.WEAPONS]: { base: 100, supply: 100, demand: 80 },
      [ResourceType.GEMS]: { base: 1000, supply: 10, demand: 50 }
    };

    for (const [resource, data] of Object.entries(basePrices)) {
      const currentPrice = this.calculatePrice(data.base, data.supply, data.demand);
      this.prices.set(resource as ResourceType, {
        basePrice: data.base,
        currentPrice,
        supply: data.supply,
        demand: data.demand,
        trend: 'stable'
      });
    }
  }

  private calculatePrice(basePrice: number, supply: number, demand: number): number {
    // Price = BasePrice * (Demand/Supply)^0.5 * GlobalModifiers
    const supplyDemandRatio = Math.max(0.1, demand / supply);
    const priceMultiplier = Math.pow(supplyDemandRatio, 0.5);
    return Math.round(basePrice * priceMultiplier * this.globalSupplyModifier * 100) / 100;
  }

  buy(resource: ResourceType, quantity: number, location: string): Transaction | null {
    const priceInfo = this.prices.get(resource);
    if (!priceInfo || priceInfo.supply < quantity) {
      return null; // Not enough supply
    }

    const unitPrice = priceInfo.currentPrice;
    const totalPrice = unitPrice * quantity;

    // Update supply/demand
    priceInfo.supply -= quantity;
    priceInfo.demand += quantity * 0.1; // Buying increases demand slightly
    
    // Update price
    const oldPrice = priceInfo.currentPrice;
    priceInfo.currentPrice = this.calculatePrice(
      priceInfo.basePrice,
      priceInfo.supply,
      priceInfo.demand
    );

    // Update trend
    priceInfo.trend = priceInfo.currentPrice > oldPrice ? 'rising' : 
                      priceInfo.currentPrice < oldPrice ? 'falling' : 'stable';

    // Record transaction
    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'buy',
      resource,
      quantity,
      unitPrice,
      totalPrice,
      location
    };

    this.transactions.push(transaction);
    return transaction;
  }

  sell(resource: ResourceType, quantity: number, location: string): Transaction | null {
    const priceInfo = this.prices.get(resource);
    if (!priceInfo) {
      return null;
    }

    const unitPrice = priceInfo.currentPrice * 0.9; // Sell for 90% of market price
    const totalPrice = unitPrice * quantity;

    // Update supply/demand
    priceInfo.supply += quantity;
    priceInfo.demand -= quantity * 0.05; // Selling decreases demand slightly
    
    // Update price
    const oldPrice = priceInfo.currentPrice;
    priceInfo.currentPrice = this.calculatePrice(
      priceInfo.basePrice,
      priceInfo.supply,
      priceInfo.demand
    );

    // Update trend
    priceInfo.trend = priceInfo.currentPrice > oldPrice ? 'rising' : 
                      priceInfo.currentPrice < oldPrice ? 'falling' : 'stable';

    // Record transaction
    const transaction: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type: 'sell',
      resource,
      quantity,
      unitPrice,
      totalPrice,
      location
    };

    this.transactions.push(transaction);
    return transaction;
  }

  getPrice(resource: ResourceType): number {
    return this.prices.get(resource)?.currentPrice || 0;
  }

  getPriceInfo(resource: ResourceType): PriceInfo | undefined {
    return this.prices.get(resource);
  }

  getAllPrices(): Map<ResourceType, PriceInfo> {
    return new Map(this.prices);
  }

  applyInflation() {
    for (const [resource, priceInfo] of this.prices) {
      priceInfo.basePrice *= (1 + this.inflationRate / 365); // Daily inflation
      priceInfo.currentPrice = this.calculatePrice(
        priceInfo.basePrice,
        priceInfo.supply,
        priceInfo.demand
      );
    }
  }

  getRecentTransactions(limit: number = 100): Transaction[] {
    return this.transactions.slice(-limit);
  }

  getTransactionsByResource(resource: ResourceType, limit: number = 50): Transaction[] {
    return this.transactions
      .filter(tx => tx.resource === resource)
      .slice(-limit);
  }

  getTotalVolume(resource: ResourceType, days: number = 1): number {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    return this.transactions
      .filter(tx => tx.resource === resource && tx.timestamp >= cutoff)
      .reduce((total, tx) => total + tx.quantity, 0);
  }

  serialize(): string {
    return JSON.stringify({
      prices: Array.from(this.prices.entries()),
      transactions: this.transactions.slice(-1000), // Keep last 1000
      inflationRate: this.inflationRate,
      globalSupplyModifier: this.globalSupplyModifier,
      globalDemandModifier: this.globalDemandModifier
    });
  }

  static deserialize(data: string): EconomyManager {
    const parsed = JSON.parse(data);
    const manager = new EconomyManager();
    
    manager.prices = new Map(parsed.prices);
    manager.transactions = parsed.transactions;
    manager.inflationRate = parsed.inflationRate;
    manager.globalSupplyModifier = parsed.globalSupplyModifier;
    manager.globalDemandModifier = parsed.globalDemandModifier;
    
    return manager;
  }
}