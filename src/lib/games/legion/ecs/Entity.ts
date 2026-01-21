export type EntityId = number;

let nextEntityId = 0;

export class Entity {
	public readonly id: EntityId;
	private components: Map<string, any> = new Map();

	constructor() {
		this.id = nextEntityId++;
	}

	addComponent<T>(name: string, component: T): this {
		this.components.set(name, component);
		return this;
	}

	getComponent<T>(name: string): T | undefined {
		return this.components.get(name);
	}

	hasComponent(name: string): boolean {
		return this.components.has(name);
	}

	removeComponent(name: string): void {
		this.components.delete(name);
	}
}

export class World {
	private entities: Map<EntityId, Entity> = new Map();

	createEntity(): Entity {
		const entity = new Entity();
		this.entities.set(entity.id, entity);
		return entity;
	}

	getEntity(id: EntityId): Entity | undefined {
		return this.entities.get(id);
	}

	removeEntity(id: EntityId): void {
		this.entities.delete(id);
	}

	getEntitiesWith(...componentNames: string[]): Entity[] {
		return Array.from(this.entities.values()).filter((entity) =>
			componentNames.every((name) => entity.hasComponent(name))
		);
	}

	clear(): void {
		this.entities.clear();
	}
}
