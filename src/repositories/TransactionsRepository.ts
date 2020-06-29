import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();

    return transactions.reduce(
      (previous, current) => {
        const result = { ...previous };
        if (current.type === 'income') {
          result.income += Number(current.value);
          result.total += Number(current.value);
        } else {
          result.outcome += Number(current.value);
          result.total -= Number(current.value);
        }
        return result;
      },
      { income: 0, outcome: 0, total: 0 },
    );
  }
}

export default TransactionsRepository;
