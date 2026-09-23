import { describe, expect, it } from 'vitest';
import { world } from '../store';
import { routeDirection } from './popups';

describe('live vehicle popup facts', () => {
  it('derives direction-aware termini from the selected vehicle route', () => {
    const v = world.vehicles.find((x) => world.routeById.get(x.route_id)!.stops.length > 1)!;
    const route = world.routeById.get(v.route_id)!;
    const outbound = routeDirection({ ...v, direction: 0 }, 'en');
    const inbound = routeDirection({ ...v, direction: 1 }, 'en');

    expect(outbound).toBe(`${route.stops[0]!.name_en} → ${route.stops.at(-1)!.name_en}`);
    expect(inbound).toBe(`${route.stops.at(-1)!.name_en} → ${route.stops[0]!.name_en}`);
    expect(inbound).not.toBe(outbound);
  });

  it('uses each vehicle route rather than a shared/static route', () => {
    const first = world.vehicles[0]!;
    const second = world.vehicles.find((v) => v.route_id !== first.route_id)!;

    expect(routeDirection(first, 'en')).toContain(world.routeById.get(first.route_id)!.stops[0]!.name_en);
    expect(routeDirection(second, 'en')).toContain(world.routeById.get(second.route_id)!.stops[0]!.name_en);
  });
});
