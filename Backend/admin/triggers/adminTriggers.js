const oracledb = require('oracledb');

const adminTriggers = {
    // Create password change trigger
    createPasswordChangeTrigger: async (connection) => {
        try {
            // Create password change log table if it doesn't exist
            await connection.execute(`
                CREATE TABLE password_change_log (
                    log_id NUMBER GENERATED ALWAYS AS IDENTITY,
                    admin_id NUMBER,
                    change_date TIMESTAMP,
                    old_password VARCHAR2(100),
                    new_password VARCHAR2(100),
                    PRIMARY KEY (log_id)
                )
            `);

            // Create or replace the password change trigger
            await connection.execute(`
                CREATE OR REPLACE TRIGGER password_change_trigger
                BEFORE UPDATE OF PASSWORD ON admin
                FOR EACH ROW
                WHEN (OLD.PASSWORD != NEW.PASSWORD)
                DECLARE
                    v_password_length NUMBER;
                BEGIN
                    -- Check password length
                    v_password_length := LENGTH(:NEW.PASSWORD);
                    IF v_password_length < 8 THEN
                        RAISE_APPLICATION_ERROR(-20001, 'Password must be at least 8 characters long');
                    END IF;

                    -- Log the password change
                    INSERT INTO password_change_log (
                        admin_id,
                        change_date,
                        old_password,
                        new_password
                    ) VALUES (
                        :NEW.ADMIN_ID,
                        SYSTIMESTAMP,
                        :OLD.PASSWORD,
                        :NEW.PASSWORD
                    );
                END;
            `);

            console.log('Password change trigger created successfully');
        } catch (error) {
            console.error('Error creating password change trigger:', error);
            throw error;
        }
    }
};

module.exports = adminTriggers; 