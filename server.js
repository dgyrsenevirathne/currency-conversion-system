const express = require('express');
const bodyParser = require('body-parser');
const sql = require('msnodesqlv8');
const multer = require('multer');
const upload = multer(); // Configure multer

const app = express(); // Initialize the app here

// Middleware
app.use(upload.array()); // Handle multipart/form-data
app.use(express.urlencoded({ extended: true })); // Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public')); // Serve static files from the public directory

// Serve the form.html file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/form.html');
});

// SQL Configuration
const sqlConfig = {
    connectionString: 'Driver={ODBC Driver 17 for SQL Server};Server=MSI\\SQLEXPRESS;Database=CurrencyConversionDB;Trusted_Connection=yes;'
};

const connectionString = sqlConfig.connectionString; // Define the connection string

// Create a new transaction
app.post('/api/transactions', (req, res) => {
    console.log(req.body);
    const { indentNo, year, month, currency, conversionRate, baseValue, value, reimbursement, harringTransport, vat, nat, advance, commission, total, complexReference, item, supplier } = req.body;

    // Log the parameters being sent to the SQL query
    console.log('Parameters:', [indentNo, year, month, currency, conversionRate, baseValue, value, reimbursement, harringTransport, vat, nat, advance, commission, total, complexReference, item, supplier]);

    // Log the ConversionRate change
    const logQuery = `
        INSERT INTO ConversionRateLogs (IndentNo, OldConversionRate, NewConversionRate, ChangedBy)
        VALUES (?, NULL, ?, 'System')
    `;

    sql.query(connectionString, logQuery, [indentNo, conversionRate], (err, result) => {
        if (err) {
            console.error('Error logging ConversionRate change:', err);
        }
    });

    // Insert the new transaction
    const query = `INSERT INTO Transactions (IndentNo, Year, Month, Currency, ConversionRate, BaseValue, Value, Reimbursement, HarringTransport, Vat, Nat, Advance, Commission, Total, ComplexReference, Item, Supplier) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    sql.query(connectionString, query, [indentNo, year, month, currency, conversionRate, baseValue, value, reimbursement, harringTransport, vat, nat, advance, commission, total, complexReference, item, supplier], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error saving transaction');
        }
        res.json({ success: true });
    });
});

// Get all transactions
app.get('/api/transactions', (req, res) => {
    const query = 'SELECT * FROM Transactions';
    sql.query(connectionString, query, [], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send('Error fetching transactions');
        }
        res.json(result);
    });
});

app.delete('/api/transactions/:indentNo', (req, res) => {
    const indentNo = req.params.indentNo.trim(); // Trim whitespace from indentNo
    console.log('Attempting to delete transaction with IndentNo:', indentNo); // Log the indentNo

    const query = 'DELETE FROM Transactions WHERE TRIM(IndentNo) = ?'; // Use TRIM in the query
    sql.query(connectionString, query, [indentNo], (err, result) => {
        if (err) {
            console.error('Error executing delete query:', err); // Log the error details
            return res.status(500).json({ message: 'Error deleting transaction', error: err }); // Return JSON
        }

        // Log the result of the delete operation
        console.log('Delete result:', result);

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            console.log('No transaction found with IndentNo:', indentNo); // Log if no rows were affected
            return res.status(404).json({ message: 'Transaction not found' }); // Return JSON
        }

        res.json({ success: true, message: 'Transaction deleted successfully' }); // Return JSON
    });
});

// Get a transaction by Indent No
app.get('/api/transactions/:indentNo', (req, res) => {
    const indentNo = req.params.indentNo.trim(); // Trim whitespace from indentNo
    const query = 'SELECT * FROM Transactions WHERE TRIM(IndentNo) = TRIM(?)';

    // Log the query and parameters
    console.log('Executing query:', query, 'with params:', [indentNo]);

    sql.query(connectionString, query, [indentNo], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ message: 'Error fetching transaction' }); // Return JSON error
        }
        if (result.length === 0) {
            return res.status(404).json({ message: 'Transaction not found' }); // Return JSON for not found
        }
        res.json(result[0]); // Return the first result
    });
});

// Update a transaction by Indent No
app.put('/api/transactions/:indentNo', (req, res) => {
    const indentNo = req.params.indentNo.trim(); // Trim whitespace from indentNo
    const { year, month, currency, conversionRate, baseValue, value, reimbursement, harringTransport, vat, nat, advance, commission, total, complexReference, item, supplier } = req.body;

    // Fetch the old ConversionRate
    const fetchOldRateQuery = 'SELECT ConversionRate FROM Transactions WHERE TRIM(IndentNo) = TRIM(?)';
    sql.query(connectionString, fetchOldRateQuery, [indentNo], (err, result) => {
        if (err) {
            console.error('Error fetching old ConversionRate:', err);
            return res.status(500).json({ message: 'Error updating transaction' });
        }

        const oldConversionRate = result[0]?.ConversionRate || null;

        // Log the ConversionRate change
        const logQuery = `
            INSERT INTO ConversionRateLogs (IndentNo, OldConversionRate, NewConversionRate, ChangedBy)
            VALUES (?, ?, ?, 'System')
        `;

        sql.query(connectionString, logQuery, [indentNo, oldConversionRate, conversionRate], (err, result) => {
            if (err) {
                console.error('Error logging ConversionRate change:', err);
            }
        });

        // Update the transaction
        const updateQuery = `UPDATE Transactions SET 
                             Year = ?, Month = ?, Currency = ?, ConversionRate = ?, BaseValue = ?, 
                             Value = ?, Reimbursement = ?, HarringTransport = ?, Vat = ?, Nat = ?, 
                             Advance = ?, Commission = ?, Total = ?, ComplexReference = ?, Item = ?, Supplier = ? 
                             WHERE TRIM(IndentNo) = TRIM(?)`;

        // Log the query and parameters
        console.log('Executing query:', updateQuery, 'with params:', [year, month, currency, conversionRate, baseValue, value, reimbursement, harringTransport, vat, nat, advance, commission, total, complexReference, item, supplier, indentNo]);

        sql.query(connectionString, updateQuery, [year, month, currency, conversionRate, baseValue, value, reimbursement, harringTransport, vat, nat, advance, commission, total, complexReference, item, supplier, indentNo], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: 'Error updating transaction' }); // Return JSON error
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ message: 'Transaction not found' }); // Return JSON for not found
            }
            res.json({ success: true });
        });
    });
});
// Start the server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});