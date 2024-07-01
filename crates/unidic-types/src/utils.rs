macro_rules! value_else_name {
    ($name:ident) => {
        stringify!($name)
    };

    ($value:literal $name:ident) => {
        $value
    };
}

pub(crate) use value_else_name;
