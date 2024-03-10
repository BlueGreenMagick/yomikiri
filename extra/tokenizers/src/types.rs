#[derive(Debug, Clone)]
pub struct Token {
    pub surface: String,
    pub pos: String,
    pub reading: String,
    pub others: Vec<String>,
}
