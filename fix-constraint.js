const pool = require('./config/database');

async function fixConstraint() {
    try {
        console.log('🔄 Veritabanı kısıtlamaları kontrol ediliyor...');
        
        // Durum sütunundaki CHECK kısıtlamasını bul ve kaldır
        const findAndDropQuery = `
            DECLARE @ConstraintName nvarchar(200);
            SELECT @ConstraintName = name 
            FROM sys.check_constraints 
            WHERE parent_object_id = OBJECT_ID('yardim_talepleri') 
            AND parent_column_id = COLUMNPROPERTY(OBJECT_ID('yardim_talepleri'), 'durum', 'ColumnId');

            IF @ConstraintName IS NOT NULL
            BEGIN
                PRINT 'Kısıtlama bulundu: ' + @ConstraintName;
                EXEC('ALTER TABLE yardim_talepleri DROP CONSTRAINT ' + @ConstraintName);
                PRINT '✅ Kısıtlama başarıyla kaldırıldı.';
            END
            ELSE
            BEGIN
                PRINT 'ℹ️ Herhangi bir CHECK kısıtlaması bulunamadı.';
            END
        `;

        await pool.query(findAndDropQuery);
        console.log('✨ İşlem tamamlandı.');
        
        process.exit(0);
    } catch (err) {
        console.error('❌ HATA:', err.message);
        process.exit(1);
    }
}

fixConstraint();
