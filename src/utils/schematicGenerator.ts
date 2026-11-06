import { ProjectState, PlacedComponent } from '../types/electrical';

export interface SchematicAnalysis {
  mainBreaker?: PlacedComponent;
  diffBreaker?: PlacedComponent;
  spd?: PlacedComponent;
  meanWellPsu?: PlacedComponent;
  psuBreaker?: PlacedComponent;
  dcBreaker?: PlacedComponent;
  plcs: PlacedComponent[];
  expansions: PlacedComponent[];
  motorStarters: { mms: PlacedComponent; contactor?: PlacedComponent }[];
  contactors: PlacedComponent[];
  relays: PlacedComponent[];
  auxCircuits: PlacedComponent[];
  terminals: PlacedComponent[];
  vikingTerminals: PlacedComponent[];
  totalPowerWatts: number;
}

export function analyzeProjectForSchematic(project: ProjectState): SchematicAnalysis {
  const allItems: PlacedComponent[] = project.rails.flatMap((r) => r.items);

  // Main breaker (Q0, QM0, or highest rated AC breaker)
  const mainBreaker = allItems.find(
    (i) => i.tag === 'Q0' || i.tag === 'QM0' || (i.data.category === 'protection_ac' && (i.data.ratedCurrentA || 0) >= 16 && !i.data.name.includes('Diferencial'))
  );

  // RCCB (Diferencial)
  const diffBreaker = allItems.find(
    (i) => i.data.category === 'protection_ac' && i.data.name.toLowerCase().includes('diferencial')
  );

  // Surge Protection SPD
  const spd = allItems.find((i) => i.tag.includes('SPD') || i.data.name.toLowerCase().includes('descarregador'));

  // Mean Well PSU
  const meanWellPsu = allItems.find((i) => i.data.category === 'power_supply');

  // PSU dedicated breaker
  const psuBreaker = allItems.find(
    (i) => i.data.category === 'protection_ac' && (i.tag === 'Q1' || i.data.name.toLowerCase().includes('fonte') || (i.data.ratedCurrentA || 0) <= 10)
  );

  // DC Breaker
  const dcBreaker = allItems.find((i) => i.data.category === 'protection_dc');

  // PLCs & Expansions
  const plcs = allItems.filter((i) => i.data.category === 'plc_cpu');
  const expansions = allItems.filter((i) => i.data.category === 'plc_expansion');

  // Motor circuits (disjuntor-motor + contactor pairs)
  const mmsList = allItems.filter((i) => i.data.category === 'motor_control' && i.data.name.toLowerCase().includes('disjuntor-motor'));
  const allContactors = allItems.filter((i) => i.data.category === 'motor_control' && i.data.name.toLowerCase().includes('contactor'));

  const motorStarters = mmsList.map((mms, idx) => ({
    mms,
    contactor: allContactors[idx],
  }));

  const standaloneContactors = allContactors.filter((c) => !motorStarters.some((ms) => ms.contactor?.instanceId === c.instanceId));

  // Relays (Finder, Schneider, timers, SSR)
  const relays = allItems.filter((i) => i.data.category === 'relays');

  const auxCircuits = allItems.filter(
    (i) => i.data.category === 'accessories' || (i.data.category === 'motor_control' && i.data.name.includes('Finder'))
  );

  const terminals = allItems.filter((i) => i.data.category === 'terminals');
  const vikingTerminals = terminals.filter((t) => t.data.brand === 'Legrand' || t.data.name.includes('Viking'));

  const totalPowerWatts = allItems.reduce((sum, item) => sum + (item.data.ratedPowerW || (item.data.dcConsumptionW || 0)), 0);

  return {
    mainBreaker,
    diffBreaker,
    spd,
    meanWellPsu,
    psuBreaker,
    dcBreaker,
    plcs,
    expansions,
    motorStarters,
    contactors: standaloneContactors,
    relays,
    auxCircuits,
    terminals,
    vikingTerminals,
    totalPowerWatts,
  };
}
