import csvParse from 'csv-parse';
import fs from 'fs';

import { getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface SingleTransactionImport {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const transactionRepository = getRepository(Transaction);
    const categoryRepository = getRepository(Category);

    const readCSVStream = fs.createReadStream(filePath);
    const parseScream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });
    const parseCSV = readCSVStream.pipe(parseScream);

    const transactionsToImport: SingleTransactionImport[] = [];
    const categoriesToImport: string[] = [];

    parseCSV.on('data', line => {
      const [title, type, value, category] = line;
      transactionsToImport.push({
        title,
        type,
        value: Number(value),
        category,
      });
      categoriesToImport.push(category);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const existingCategories = await categoryRepository.find({
      where: {
        title: In(categoriesToImport),
      },
    });

    const categoriesToCreate = Array.from(
      new Set(
        categoriesToImport.filter(category => {
          return !existingCategories.find(
            existingCategory => existingCategory.title === category,
          );
        }),
      ),
    );

    const createdCategories = categoryRepository.create(
      categoriesToCreate.map(categoryName => ({ title: categoryName })),
    );

    await categoryRepository.save(createdCategories);

    const allCategories = [...existingCategories, ...createdCategories];

    const createdTransactions = transactionRepository.create(
      transactionsToImport.map(transaction => ({
        ...transaction,
        category: allCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);

    return createdTransactions;
  }
}

export default ImportTransactionsService;
