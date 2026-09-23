import { DataSource, In } from "typeorm";
import { type Seeder } from "typeorm-extension";

export default class MainSeeder implements Seeder {
    public async run(database: DataSource): Promise<void> {
        await database.transaction(async (manager) => {
           
        });
    }
}
