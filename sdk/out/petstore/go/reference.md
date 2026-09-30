# Reference
## Pets
<details><summary><code>client.Pets.ListPets() -> []*petstore.Pet</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
client.Pets.ListPets(
    context.TODO(),
)
```
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

<details><summary><code>client.Pets.CreatePet(request) -> *petstore.Pet</code></summary>
<dl>
<dd>

#### 🔌 Usage

<dl>
<dd>

<dl>
<dd>

```go
request := &petstore.Pet{
    Name: "name",
}
client.Pets.CreatePet(
    context.TODO(),
    request,
)
```
</dd>
</dl>
</dd>
</dl>

#### ⚙️ Parameters

<dl>
<dd>

<dl>
<dd>

**request:** `*petstore.Pet` 
    
</dd>
</dl>
</dd>
</dl>


</dd>
</dl>
</details>

