use std::fmt::{Debug, Write};

#[derive(Clone)]
pub struct Token {
    pub surface: String,
    pub pos: String,
    pub reading: String,
    pub others: Vec<String>,
}

impl Debug for Token {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.surface)?;
        //f.write_char('/')?;
        // f.write_str(&self.pos.split('-').next().unwrap_or(""))?;
        f.write_char(':')?;
        f.write_str(&self.reading)?;
        Ok(())
    }
}
