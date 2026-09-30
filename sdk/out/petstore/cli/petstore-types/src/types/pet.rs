pub use crate::prelude::*;
#[allow(unused_imports)]
use super::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Pet {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub id: Option<i64>,
    #[serde(default)]
    pub name: String,
}

impl Pet {
    pub fn builder() -> PetBuilder {
        <PetBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PetBuilder {
    id: Option<i64>,
    name: Option<String>,
}

impl PetBuilder {
    pub fn id(mut self, value: i64) -> Self {
        self.id = Some(value);
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`Pet`].
    /// This method will fail if any of the following fields are not set:
    /// - [`name`](PetBuilder::name)
    pub fn build(self) -> Result<Pet, BuildError> {
        Ok(Pet {
            id: self.id,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
        })
    }
}
